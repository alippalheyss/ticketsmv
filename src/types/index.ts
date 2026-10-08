export type TenantTier = 'free' | 'paid';
export type TenantStatus = 'active' | 'suspended' | 'pending';

export interface BankDetails {
  bankName: string; // e.g. "Bank of Maldives (BML)" or "Maldives Islamic Bank (MIB)"
  accountNumber: string; // e.g. "7701 1928 4401 001"
  accountName: string; // e.g. "Olympus Cinema Pvt Ltd"
  currency: string; // "MVR"
  qrImageUrl?: string; // QR code image for fast BML app transfer
  instructions?: string; // "Please mention booking ref in transaction memo"
}

export interface TenantBranding {
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  contactPhone: string;
  contactViber: string;
  island: string;
  atoll: string;
  terms: string;
  taglineEn?: string;
  taglineDv?: string;
  bankDetails?: BankDetails;
}

export type SubscriptionModel = 'weekly' | 'monthly' | 'yearly' | 'one_month' | 'free_trial';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tenantCode: string; // Unique, recognizable tenant code e.g. "OLY-01", "VEL-02", "KHD-03"
  tier: TenantTier;
  status: TenantStatus;
  branding: TenantBranding;
  subscriptionModel: SubscriptionModel; // 'weekly' | 'monthly' | 'yearly' | 'free_trial'
  subscriptionPriceMvr: number; // e.g. 149 for weekly, 249 for monthly, 499 for yearly
  subscriptionBillingDate?: string;
  createdAt: string;
  ownerEmail: string;
  passwordHash?: string; // Stored hash for organizer credential authentication
  cinemaSlots?: number; // Allowed cinema management slots (default: 1)
}

export interface PlatformBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  instructions: string;
  qrImageUrl?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactTelegram?: string;
  contactEmail?: string;
}

export interface TenantRegistrationRequest {
  id: string;
  tenantCode: string; // Unique assigned code e.g. "ORG-9142"
  cinemaName: string;
  atoll: string;
  island: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  passwordHash?: string;
  subscriptionPlan: 'weekly' | 'monthly' | 'yearly' | 'one_month';
  subscriptionPriceMvr: number;
  paymentMethod: 'bml_transfer' | 'bml_gateway' | 'mfaisaa' | 'cash';
  paymentSlipUrl?: string;
  slipUrl?: string;
  channel: 'in_app' | 'whatsapp' | 'telegram';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Hall {
  id: string;
  tenantId: string;
  name: string;
  island: string;
  atoll: string;
  address: string;
  contactPhone: string;
}

export type SeatType = 'standard' | 'vip' | 'couple' | 'accessible' | 'aisle' | 'space';

export interface SeatConfig {
  id: string; // e.g. "A-1"
  row: string; // "A"
  col: number; // 1
  type: SeatType;
  priceModifier?: number; // specific price override or multiplier
  active: boolean;
}

export interface ScreenLayout {
  rows: number;
  cols: number;
  rowLabels: string[];
  seats: SeatConfig[];
  screenPosition: 'top' | 'bottom';
  stageName?: string;
}

export interface Screen {
  id: string;
  hallId: string;
  tenantId: string;
  screenName: string; // e.g. "Screen 1 (Left Wing)", "Screen 2 (Center)", "Screen 3 (Right Wing)"
  screenNumber?: number; // 1, 2, 3...
  positionInHall?: 'left' | 'center' | 'right' | 'balcony' | 'front';
  layout: ScreenLayout;
}

export interface Movie {
  id: string;
  tenantId?: string; // empty means global Maldivian distribution
  titleEn: string;
  titleDv: string;
  synopsisEn: string;
  synopsisDv: string;
  posterUrl: string;
  backdropUrl: string;
  durationMinutes: number;
  ageRating: 'G' | 'PG' | 'PG-13' | '15+' | '18+';
  trailerYoutubeUrl: string;
  cast: string[];
  genre: string[];
  releaseDate: string;
  published?: boolean; // true = Live on site, false = Private / Draft
}

export interface PriceTiers {
  standard: number;
  vip: number;
  couple: number;
  accessible: number;
}

export interface Showtime {
  id: string;
  movieId: string;
  screenId: string;
  hallId: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  priceTiers: PriceTiers;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
}

export type PaymentMethod = 'bml_gateway' | 'bml_transfer' | 'mfaisaa' | 'cash';
export type PaymentStatus = 'paid' | 'pending_verification' | 'expired' | 'refunded';

export interface BookedSeat {
  seatId: string;
  row: string;
  col: number;
  label: string;
  type: SeatType;
  price: number;
  screenId?: string;
}

export interface Booking {
  id: string;
  bookingRef: string; // e.g. "MV-8942-X"
  showtimeId: string;
  tenantId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string; // Maldivian (+960)
  seats: BookedSeat[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  slipUrl?: string;
  qrCodeHash: string;
  checkedIn: boolean;
  checkedInAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SeatHold {
  showtimeId: string;
  screenId?: string;
  seatId: string;
  sessionId: string;
  expiresAt: number; // timestamp ms
}

export interface SystemLog {
  id: string;
  type: 'payment' | 'tenant' | 'email' | 'checkin';
  tenantId?: string;
  message: string;
  details?: string;
  status: 'success' | 'warning' | 'info' | 'error';
  timestamp: string;
}
