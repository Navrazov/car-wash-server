import mongoose from 'mongoose';
import crypto from 'crypto';

export interface IAdminInvite extends mongoose.Document {
  email: string;
  token: string;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'expired';
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminInviteSchema = new mongoose.Schema<IAdminInvite>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
    },
    acceptedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

adminInviteSchema.index({ token: 1 });
adminInviteSchema.index({ email: 1, status: 1 });
adminInviteSchema.index({ expiresAt: 1 });

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const AdminInvite = mongoose.model<IAdminInvite>('AdminInvite', adminInviteSchema);

export default AdminInvite;
