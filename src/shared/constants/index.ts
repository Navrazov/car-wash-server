export const BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'failed'] as const;
export const ADMIN_ROLES = ['admin', 'super_admin'] as const;
export const SERVICE_CATEGORIES = ['wash', 'detailing', 'maintenance', 'other'] as const;

export const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = 9 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

export const DEFAULT_PREPAYMENT = 100;
