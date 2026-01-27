import mongoose from 'mongoose';

export interface IEmployeeSchedule extends mongoose.Document {
  employeeId: mongoose.Types.ObjectId;
  boxId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  date: Date;
  startTime?: string; // HH:mm format, optional - if not set, whole day
  endTime?: string; // HH:mm format, optional
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeScheduleSchema = new mongoose.Schema<IEmployeeSchedule>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    boxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Box',
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
employeeScheduleSchema.index({ employeeId: 1, date: 1 });
employeeScheduleSchema.index({ boxId: 1, date: 1 });
employeeScheduleSchema.index({ locationId: 1, date: 1 });
employeeScheduleSchema.index({ date: 1, isActive: 1 });

const EmployeeSchedule = mongoose.model<IEmployeeSchedule>('EmployeeSchedule', employeeScheduleSchema);

export default EmployeeSchedule;
