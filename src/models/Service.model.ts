import mongoose from 'mongoose';

export interface IService extends mongoose.Document {
  name: string;
  description?: string;
  price: number;
  duration: number; // в минутах
  category?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new mongoose.Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      min: 15, // минимум 15 минут
    },
    category: {
      type: String,
      enum: ['wash', 'detailing', 'maintenance', 'other'],
      default: 'wash',
    },
    imageUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
serviceSchema.index({ isActive: 1, category: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ createdAt: -1 });

const Service = mongoose.model<IService>('Service', serviceSchema);

export default Service;
