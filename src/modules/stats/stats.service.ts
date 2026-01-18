import Booking from '@models/Booking.model';
import User from '@models/User.model';

export class StatsService {
  async getDashboardStats() {
    const [totalCustomers, totalBookings, completedBookings, pendingBookings, todayBookings] =
      await Promise.all([
        User.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'completed' }),
        Booking.countDocuments({ status: 'pending', prepaymentStatus: 'paid' }),
        Booking.countDocuments({
          bookingDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        }),
      ]);

    const revenueData = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    const recentBookings = await Booking.find()
      .populate('userId', 'name phone')
      .populate('locationId', 'name')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const topServices = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: '$service' },
      {
        $project: {
          name: '$service.name',
          count: 1,
        },
      },
    ]);

    return {
      totalCustomers,
      totalBookings,
      completedBookings,
      pendingBookings,
      todayBookings,
      totalRevenue,
      recentBookings,
      topServices,
    };
  }
}

export const statsService = new StatsService();

