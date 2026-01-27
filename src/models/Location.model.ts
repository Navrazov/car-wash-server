import mongoose from 'mongoose';

export interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  phone?: string;
  workingHours?: string;
  description?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  rating: number; // Average rating 1-5
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new mongoose.Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    workingHours: {
      type: String,
      default: '9:00 - 21:00',
    },
    description: {
      type: String,
      trim: true,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
locationSchema.index({ isActive: 1 });
locationSchema.index({ createdAt: -1 });

const Location = mongoose.model<ILocation>('Location', locationSchema);

export default Location;
