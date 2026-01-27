import Review from '@models/Review.model';
import Booking from '@models/Booking.model';
import Employee from '@models/Employee.model';
import Location from '@models/Location.model';
import Box from '@models/Box.model';
import { NotFoundError, ValidationError } from '@shared/errors';
import logger from '@config/logger';

interface CreateReviewData {
  userId: string;
  bookingId: string;
  employeeRating?: number;
  locationRating: number;
  employeeComment?: string;
  locationComment?: string;
}

export class ReviewService {
  async create(data: CreateReviewData) {
    // Verify booking exists and belongs to user
    const booking = await Booking.findById(data.bookingId)
      .populate('boxId')
      .populate('locationId');
    
    if (!booking) {
      throw new NotFoundError('Бронирование');
    }

    if (booking.userId.toString() !== data.userId) {
      throw new ValidationError('Вы можете оставить отзыв только на свое бронирование');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError('Можно оставить отзыв только на завершенное бронирование');
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId: data.bookingId });
    if (existingReview) {
      throw new ValidationError('Отзыв на это бронирование уже оставлен');
    }

    // Determine employeeId - use from booking or from box
    let employeeId = booking.employeeId?.toString();
    
    if (!employeeId && booking.boxId) {
      const box = booking.boxId as any;
      // Try to find employee assigned to this box
      const boxEmployee = await Employee.findOne({ boxId: box._id });
      if (boxEmployee) {
        employeeId = boxEmployee._id.toString();
      }
    }

    // If still no employeeId, try to find from schedule for booking date
    if (!employeeId && booking.boxId) {
      try {
        const { employeeScheduleService } = await import('../employee-schedule');
        const box = booking.boxId as any;
        const scheduleEmployeeId = await employeeScheduleService.getEmployeeForBox(
          box._id.toString(),
          booking.bookingDate,
          booking.bookingTime
        );
        if (scheduleEmployeeId) {
          employeeId = scheduleEmployeeId;
        }
      } catch (e) {
        // Ignore if schedule service is not available
      }
    }

    const review = new Review({
      userId: data.userId,
      bookingId: data.bookingId,
      employeeId: employeeId || undefined,
      locationId: (booking.locationId as any)._id.toString(),
      employeeRating: data.employeeRating,
      locationRating: data.locationRating,
      employeeComment: data.employeeComment,
      locationComment: data.locationComment,
    });

    await review.save();

    // Update employee rating if employeeId exists
    if (employeeId && data.employeeRating) {
      await this.updateEmployeeRating(employeeId);
    }

    // Update location rating
    await this.updateLocationRating((booking.locationId as any)._id.toString());

    logger.info(`Review created: ${review._id}`);
    return review;
  }

  async updateEmployeeRating(employeeId: string) {
    const reviews = await Review.find({ employeeId, employeeRating: { $exists: true } });
    
    if (reviews.length === 0) {
      await Employee.findByIdAndUpdate(employeeId, {
        rating: 0,
        totalReviews: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, r) => sum + (r.employeeRating || 0), 0);
    const averageRating = totalRating / reviews.length;

    await Employee.findByIdAndUpdate(employeeId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
    });
  }

  async updateLocationRating(locationId: string) {
    const reviews = await Review.find({ locationId });
    
    if (reviews.length === 0) {
      await Location.findByIdAndUpdate(locationId, {
        rating: 0,
        totalReviews: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.locationRating, 0);
    const averageRating = totalRating / reviews.length;

    await Location.findByIdAndUpdate(locationId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
    });
  }

  async getByBooking(bookingId: string) {
    return Review.findOne({ bookingId })
      .populate('userId', 'name phone')
      .populate('employeeId', 'name')
      .populate('locationId', 'name');
  }

  async getByEmployee(employeeId: string, limit: number = 10) {
    return Review.find({ employeeId, employeeRating: { $exists: true } })
      .populate('userId', 'name phone')
      .populate('bookingId', 'bookingDate bookingTime')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getByLocation(locationId: string, limit: number = 10) {
    return Review.find({ locationId })
      .populate('userId', 'name phone')
      .populate('employeeId', 'name')
      .populate('bookingId', 'bookingDate bookingTime')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getAllLocationsWithRatings() {
    return Location.find({ isActive: true })
      .select('name address rating totalReviews coordinates')
      .sort({ rating: -1, totalReviews: -1 });
  }

  async getAllEmployeesWithRatings() {
    return Employee.find({ isActive: true })
      .populate('locationId', 'name')
      .select('name locationId position rating totalReviews')
      .sort({ rating: -1, totalReviews: -1 });
  }

  async getEmployeeStats(employeeId: string) {
    const reviews = await Review.find({ employeeId, employeeRating: { $exists: true } });
    
    const ratingCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviews.forEach(review => {
      if (review.employeeRating) {
        ratingCounts[review.employeeRating as keyof typeof ratingCounts]++;
      }
    });

    return {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.employeeRating || 0), 0) / reviews.length
        : 0,
      ratingCounts,
    };
  }

  async getLocationStats(locationId: string) {
    const reviews = await Review.find({ locationId });
    
    const ratingCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviews.forEach(review => {
      ratingCounts[review.locationRating as keyof typeof ratingCounts]++;
    });

    return {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.locationRating, 0) / reviews.length
        : 0,
      ratingCounts,
    };
  }
}

export const reviewService = new ReviewService();
