import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import logger from './logger';
import { seedDatabase } from './seed-data';

let mongoServer: any = null;

const parseEmbeddedMongoPort = (dbPath: string): number | null => {
  try {
    const output = execSync('ps -axww -o pid=,command=', { encoding: 'utf8' });
    const normalizedDbPath = dbPath.replace(/\\/g, '/');
    const dbName = path.basename(normalizedDbPath);

    for (const rawLine of output.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;

      const firstSpace = line.indexOf(' ');
      const command = firstSpace >= 0 ? line.slice(firstSpace + 1) : line;
      const normalizedCommand = command.replace(/\\ /g, ' ').replace(/\\/g, '/');

      if (
        !normalizedCommand.includes('mongodb-memory-server') ||
        !normalizedCommand.includes('--dbpath') ||
        (!normalizedCommand.includes(normalizedDbPath) && !normalizedCommand.includes(dbName))
      ) {
        continue;
      }

      const match = normalizedCommand.match(/--port\s+(\d+)/);
      if (!match) continue;

      const port = Number(match[1]);
      if (Number.isFinite(port)) return port;
    }

    return null;
  } catch {
    return null;
  }
};

const connectToExistingEmbeddedMongo = async (dbPath: string): Promise<boolean> => {
  const port = parseEmbeddedMongoPort(dbPath);
  if (!port) return false;
  await mongoose.connect(`mongodb://127.0.0.1:${port}/carwash`);
  logger.info(`✅ Connected to existing embedded MongoDB on port ${port}`);
  logger.info(`💾 Persistent DB path: ${dbPath}`);
  return true;
};

const removeStaleMongoLock = (dbPath: string): boolean => {
  const lockPath = path.join(dbPath, 'mongod.lock');
  if (!fs.existsSync(lockPath)) return false;

  try {
    fs.rmSync(lockPath, { force: true });
    logger.warn(`⚠️ Removed stale MongoDB lock file: ${lockPath}`);
    return true;
  } catch {
    return false;
  }
};

const startEmbeddedMongo = async (dbPath: string, modeLabel: string): Promise<void> => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  fs.mkdirSync(dbPath, { recursive: true });

  // Reuse existing mongod first to avoid DBPath lock flaps on nodemon restarts.
  const connectedToExisting = await connectToExistingEmbeddedMongo(dbPath);
  if (connectedToExisting) return;

  const createAndConnect = async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: { dbPath },
    });
    const memoryUri = mongoServer.getUri();
    await mongoose.connect(memoryUri);
    logger.info(`✅ Connected to embedded MongoDB (${modeLabel})`);
    logger.info(`💾 Persistent DB path: ${dbPath}`);
  };

  try {
    await createAndConnect();
  } catch (embeddedErr) {
    const msg = embeddedErr instanceof Error ? embeddedErr.message : String(embeddedErr);
    if (!msg.includes('DBPathInUse')) {
      throw embeddedErr;
    }

    logger.warn('⚠️ Embedded Mongo DBPath is locked, trying to reuse running instance...');
    const connected = await connectToExistingEmbeddedMongo(dbPath);
    if (connected) return;

    // No running process detected, lock file is likely stale.
    const removed = removeStaleMongoLock(dbPath);
    if (!removed) {
      throw embeddedErr;
    }

    await createAndConnect();
  }
};

export const connectToDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB;
  const forceEmbeddedDb = mongoUri === 'memory' || process.env.USE_MEMORY_DB === 'true';
  const useRemoteDb = process.env.USE_REMOTE_DB === 'true' && !!mongoUri && !forceEmbeddedDb;
  const useMemoryServer = !useRemoteDb;
  const persistentFallbackDbPath =
    process.env.MEMORY_DB_PATH || path.resolve(process.cwd(), '.local-mongo-data');

  try {
    if (useMemoryServer) {
      // Use local embedded MongoDB with persistent dbPath for development
      logger.info('🔧 Starting embedded MongoDB server...');
      await startEmbeddedMongo(persistentFallbackDbPath, 'dev mode');
      
      // Auto-seed in memory mode
      await seedDatabase();
    } else {
      // Use external MongoDB
      if (!mongoUri) {
        throw new Error('MONGODB environment variable is not set');
      }
      logger.info('🔌 Connecting to remote MongoDB (USE_REMOTE_DB=true)...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority',
      });
      logger.info('✅ Successfully connected to MongoDB');
      logger.info(`📊 Database: ${mongoose.connection.name}`);
      logger.info(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    }
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err);
    
    // Try fallback to memory server
    if (!useMemoryServer) {
      logger.info('🔄 Falling back to embedded MongoDB...');
      try {
        await startEmbeddedMongo(persistentFallbackDbPath, 'fallback');
        
        // Auto-seed in fallback memory mode
        await seedDatabase();
        return;
      } catch (memErr) {
        logger.error('❌ Failed to start in-memory MongoDB:', memErr);
        process.exit(1);
      }
    }
    process.exit(1);
  }

  // Handle connection events
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
};

export const stopDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};
