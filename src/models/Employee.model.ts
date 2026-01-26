import mongoose from 'mongoose';

export interface IEmployee extends mongoose.Document {
  locationId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  position?: string;
  specialization?: string[];
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

