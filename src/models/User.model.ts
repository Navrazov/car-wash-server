import mongoose from 'mongoose';

export interface ICar {
  brand: string;
  model: string;
  plateNumber: string;
  year?: number;
  isDefault: boolean;
}

export interface IUser extends mongoose.Document {
  phone: string;
  name?: string;
  email?: string;
  carModel?: string;
  carNumber?: string;
  cars: mongoose.Types.DocumentArray<ICar>;
  totalVisits: number;
  totalSpent: number;
  rating: number;
  isActive: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  createdAt: Date;
}

const carSchema = new mongoose.Schema<ICar>(
  {
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    plateNumber: { type: String, required: true, trim: true, uppercase: true },
    year: { type: Number },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[\d\+\-\(\)\s]+$/,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    },
    carModel: {
      type: String,
      trim: true,
    },
    carNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    cars: {
      type: [carSchema],
      default: [],
    },
    totalVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verificationCode: {
      type: String,
    },
    verificationCodeExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
