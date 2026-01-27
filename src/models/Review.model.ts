import mongoose from 'mongoose';

export interface IReview extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  employeeRating?: number; // 1-5
  locationRating: number; // 1-5
  employeeComment?: string;
  locationComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new mongoose.Schema<IReview>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // One review per booking
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    employeeRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    locationRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    employeeComment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    locationComment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Indexes
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ employeeId: 1 });
reviewSchema.index({ locationId: 1 });
reviewSchema.index({ bookingId: 1 }, { unique: true });

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
