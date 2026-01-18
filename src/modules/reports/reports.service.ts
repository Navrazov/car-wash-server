import Booking from '../../models/Booking.model';
import Box from '../../models/Box.model';
import Location from '../../models/Location.model';
import mongoose from 'mongoose';

interface BoxReport {
  boxId: string;
  boxName: string;
  boxNumber: number;
  locationId: string;
  locationName: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
}

interface PeriodReport {
  period: string;
  startDate: Date;
  endDate: Date;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageCheck: number;
  boxReports: BoxReport[];
}

interface LocationReport {
  locationId: string;
  locationName: string;
  totalBookings: number;
  completedBookings: number;
  revenue: number;
  boxes: BoxReport[];
}

class ReportsService {
  private getDateRange(period: 'week' | 'month' | 'quarter' | 'year' | 'custom', startDate?: Date, endDate?: Date): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (period) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('Start and end dates are required for custom period');
        }
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  async getBoxesReport(
    period: 'week' | 'month' | 'quarter' | 'year' | 'custom' = 'month',
    locationId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PeriodReport> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Get all boxes, optionally filtered by location
    const boxFilter: any = { isActive: true };
    if (locationId) {
      boxFilter.locationId = new mongoose.Types.ObjectId(locationId);
    }
    const boxes = await Box.find(boxFilter).populate('locationId', 'name');

    const boxReports: BoxReport[] = [];
    let totalBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let totalRevenue = 0;

    for (const box of boxes) {
      const location = box.locationId as any;

      // Get bookings for this box in the period (including bookings without boxId for the same location)
      const bookings = await Booking.find({
        $or: [
          { boxId: box._id },
          { boxId: { $exists: false }, locationId: box.locationId },
          { boxId: null, locationId: box.locationId },
        ],
        bookingDate: { $gte: start, $lte: end },
      });

      const boxTotalBookings = bookings.length;
      const boxCompletedBookings = bookings.filter((b) => b.status === 'completed').length;
      const boxCancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
      const boxRevenue = bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + b.totalPrice, 0);

      totalBookings += boxTotalBookings;
      completedBookings += boxCompletedBookings;
      cancelledBookings += boxCancelledBookings;
      totalRevenue += boxRevenue;

      boxReports.push({
        boxId: box._id.toString(),
        boxName: box.name,
        boxNumber: box.number,
        locationId: location?._id?.toString() || '',
        locationName: location?.name || 'Unknown',
        totalBookings: boxTotalBookings,
        completedBookings: boxCompletedBookings,
        cancelledBookings: boxCancelledBookings,
        revenue: boxRevenue,
      });
    }

    // Sort by revenue descending
    boxReports.sort((a, b) => b.revenue - a.revenue);

    return {
      period,
      startDate: start,
      endDate: end,
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      averageCheck: completedBookings > 0 ? totalRevenue / completedBookings : 0,
      boxReports,
    };
  }

  async getLocationReports(
    period: 'week' | 'month' | 'quarter' | 'year' | 'custom' = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<LocationReport[]> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const locations = await Location.find({ isActive: true });
    const reports: LocationReport[] = [];

    for (const location of locations) {
      const boxes = await Box.find({ locationId: location._id, isActive: true });
      const boxReports: BoxReport[] = [];
      let locationTotalBookings = 0;
      let locationCompletedBookings = 0;
      let locationRevenue = 0;

      // Get all bookings for this location (including those without boxId)
      const allLocationBookings = await Booking.find({
        locationId: location._id,
        bookingDate: { $gte: start, $lte: end },
      });

      locationTotalBookings = allLocationBookings.length;
      locationCompletedBookings = allLocationBookings.filter((b) => b.status === 'completed').length;
      locationRevenue = allLocationBookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + b.totalPrice, 0);

      for (const box of boxes) {
        const bookings = await Booking.find({
          $or: [
            { boxId: box._id },
            { boxId: { $exists: false }, locationId: location._id },
            { boxId: null, locationId: location._id },
          ],
          bookingDate: { $gte: start, $lte: end },
        });

        const boxTotalBookings = bookings.length;
        const boxCompletedBookings = bookings.filter((b) => b.status === 'completed').length;
        const boxCancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
        const boxRevenue = bookings
          .filter((b) => b.status === 'completed')
          .reduce((sum, b) => sum + b.totalPrice, 0);

        boxReports.push({
          boxId: box._id.toString(),
          boxName: box.name,
          boxNumber: box.number,
          locationId: location._id.toString(),
          locationName: location.name,
          totalBookings: boxTotalBookings,
          completedBookings: boxCompletedBookings,
          cancelledBookings: boxCancelledBookings,
          revenue: boxRevenue,
        });
      }

      reports.push({
        locationId: location._id.toString(),
        locationName: location.name,
        totalBookings: locationTotalBookings,
        completedBookings: locationCompletedBookings,
        revenue: locationRevenue,
        boxes: boxReports.sort((a, b) => b.revenue - a.revenue),
      });
    }

    // Sort by revenue descending
    reports.sort((a, b) => b.revenue - a.revenue);

    return reports;
  }

  async getRevenueByPeriod(
    groupBy: 'day' | 'week' | 'month' = 'day',
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    locationId?: string
  ): Promise<{ date: string; revenue: number; bookings: number }[]> {
    const { start, end } = this.getDateRange(period);

    const matchStage: any = {
      bookingDate: { $gte: start, $lte: end },
      status: 'completed',
    };

    if (locationId) {
      matchStage.locationId = new mongoose.Types.ObjectId(locationId);
    }

    let dateFormat: string;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const result = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$bookingDate' } },
          revenue: { $sum: '$totalPrice' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((item) => ({
      date: item._id,
      revenue: item.revenue,
      bookings: item.bookings,
    }));
  }

  async getTopBoxes(limit: number = 5, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<BoxReport[]> {
    const report = await this.getBoxesReport(period);
    return report.boxReports.slice(0, limit);
  }

  async getSummary(): Promise<{
    today: { bookings: number; revenue: number };
    week: { bookings: number; revenue: number };
    month: { bookings: number; revenue: number };
    year: { bookings: number; revenue: number };
  }> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const getSummaryForPeriod = async (start: Date, end: Date) => {
      const bookings = await Booking.find({
        bookingDate: { $gte: start, $lte: end },
        status: 'completed',
      });
      return {
        bookings: bookings.length,
        revenue: bookings.reduce((sum, b) => sum + b.totalPrice, 0),
      };
    };

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    const yearStart = new Date(now);
    yearStart.setFullYear(now.getFullYear() - 1);
    yearStart.setHours(0, 0, 0, 0);

    const [today, week, month, year] = await Promise.all([
      getSummaryForPeriod(todayStart, todayEnd),
      getSummaryForPeriod(weekStart, todayEnd),
      getSummaryForPeriod(monthStart, todayEnd),
      getSummaryForPeriod(yearStart, todayEnd),
    ]);

    return { today, week, month, year };
  }
}

export const reportsService = new ReportsService();

