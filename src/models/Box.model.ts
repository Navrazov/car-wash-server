import mongoose from 'mongoose';

export interface IBox extends mongoose.Document {
  locationId: mongoose.Types.ObjectId;
  name: string;
  number: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const boxSchema = new mongoose.Schema<IBox>(
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
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
boxSchema.index({ locationId: 1, number: 1 }, { unique: true });
boxSchema.index({ isActive: 1 });

const Box = mongoose.model<IBox>('Box', boxSchema);

export default Box;




