import mongoose from 'mongoose';

export interface IEmployee extends mongoose.Document {
  locationId: mongoose.Types.ObjectId;
  boxId?: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  position?: string;
  specialization?: string[];
  rating: number; // Average rating 1-5
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new mongoose.Schema<IEmployee>(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    boxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Box',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    },
    position: {
      type: String,
      trim: true,
    },
    specialization: {
      type: [String],
      default: [],
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
employeeSchema.index({ locationId: 1, isActive: 1 });
employeeSchema.index({ createdAt: -1 });

const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);

export default Employee;

