import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  phone: string;
  name?: string;
  email?: string;
  carModel?: string;
  carNumber?: string;
  totalVisits: number;
  totalSpent: number;
  isActive: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  createdAt: Date;
}

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
