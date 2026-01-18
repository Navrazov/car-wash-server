import mongoose from 'mongoose';

export interface IBooking extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  boxId?: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  bookingDate: Date;
  bookingTime: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  totalPrice: number;
  prepaymentAmount: number;
  prepaymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  paymentUrl?: string;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new mongoose.Schema<IBooking>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    boxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Box',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    bookingTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    prepaymentAmount: {
      type: Number,
      required: true,
      default: 100, // 100 рублей предоплата
      min: 0,
    },
    prepaymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentId: {
      type: String,
    },
    paymentUrl: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ locationId: 1, bookingDate: 1 });
bookingSchema.index({ boxId: 1, bookingDate: 1, bookingTime: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ prepaymentStatus: 1 });
bookingSchema.index({ bookingDate: 1, bookingTime: 1 });

const Booking = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
