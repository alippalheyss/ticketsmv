import { 
  Tenant, Hall, Screen, Movie, Showtime, Booking, SeatHold, SystemLog, SeatConfig, SeatType, TenantRegistrationRequest 
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper mappers between Supabase PostgreSQL snake_case and TypeScript camelCase
function mapMovieFromDb(row: any): Movie {
  return {
    id: row.id,
    tenantId: row.tenant_id || undefined,
    titleEn: row.title_en,
    titleDv: row.title_dv || '',
    synopsisEn: row.synopsis_en || '',
    synopsisDv: row.synopsis_dv || '',
    posterUrl: row.poster_url || '',
    backdropUrl: row.backdrop_url || '',
    durationMinutes: Number(row.duration_minutes) || 120,
    ageRating: row.age_rating || 'PG-13',
    trailerYoutubeUrl: row.trailer_youtube_url || '',
    cast: row.cast_members || [],
    genre: row.genres || [],
    releaseDate: row.release_date || new Date().toISOString().split('T')[0],
    published: row.published !== false
  };
}

function mapShowtimeFromDb(row: any): Showtime {
  return {
    id: row.id,
    movieId: row.movie_id,
    screenId: row.screen_id,
    hallId: row.hall_id,
    tenantId: row.tenant_id,
    date: row.show_date,
    startTime: typeof row.start_time === 'string' ? row.start_time.substring(0, 5) : '20:30',
    endTime: typeof row.end_time === 'string' ? row.end_time.substring(0, 5) : '22:30',
    priceTiers: typeof row.price_tiers === 'object' && row.price_tiers ? row.price_tiers : { standard: 100, vip: 150, couple: 250, accessible: 80 },
    status: row.status || 'scheduled'
  };
}

function mapTenantFromDb(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tenantCode: row.tenant_code || row.branding?.tenantCode || 'ORG-01',
    tier: row.tier || 'paid',
    status: row.status || 'active',
    branding: row.branding || {
      logoUrl: '',
      bannerUrl: '',
      primaryColor: '#0d9488',
      contactPhone: '',
      island: 'Malé',
      atoll: 'Kaafu',
      terms: ''
    },
    subscriptionModel: row.subscription_model || row.branding?.subscriptionModel || 'monthly',
    subscriptionPriceMvr: Number(row.subscription_price_mvr) || Number(row.branding?.subscriptionPriceMvr) || 249,
    subscriptionBillingDate: row.subscription_billing_date || row.branding?.subscriptionBillingDate,
    createdAt: row.created_at,
    ownerEmail: row.owner_email,
    cinemaSlots: row.cinema_slots || row.branding?.cinemaSlots || 1
  };
}

const STORAGE_KEYS = {
  TENANTS: 'mv_tickets_tenants_v3',
  HALLS: 'mv_tickets_halls_v2',
  SCREENS: 'mv_tickets_screens_v2',
  MOVIES: 'mv_tickets_movies_v2',
  SHOWTIMES: 'mv_tickets_showtimes_v2',
  BOOKINGS: 'mv_tickets_bookings_v2',
  SEAT_HOLDS: 'mv_tickets_seat_holds_v2',
  SYSTEM_LOGS: 'mv_tickets_logs_v2',
  TENANT_REQUESTS: 'mv_tickets_tenant_requests_v1',
};

// Default Initial Maldivian Data
const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Olympus Cinema Malé',
    slug: 'olympus',
    tenantCode: 'OLY-01', // Recognized Tenant Code
    tier: 'paid', // Paid tier = multi-screen / multi-hall enabled
    status: 'active',
    ownerEmail: 'alippalheys@gmail.com',
    subscriptionModel: 'monthly', // 'weekly' | 'monthly' | 'one_month' | 'free_trial'
    subscriptionPriceMvr: 249, // Flat monthly subscription (no commission percentage!)
    subscriptionBillingDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=200&h=200&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=600&fit=crop&q=80',
      primaryColor: '#0d9488',
      contactPhone: '+960 332-2345',
      contactViber: '+960 798-1122',
      island: "Malé City",
      atoll: 'Kaafu (K)',
      terms: 'Tickets are non-refundable. Please arrive 15 minutes before showtime. Outside food is not permitted.',
      taglineEn: 'The Historic Home of Maldivian Cinema & Arts',
      taglineDv: 'ދިވެހި ސިނަމާގެ ތާރީޚީ ހާލި - އޮލިމްޕަސް',
      bankDetails: {
        bankName: 'Bank of Maldives (BML)',
        accountNumber: '7701 1928 4401 001',
        accountName: 'Olympus Cinema Malé Pvt Ltd',
        currency: 'MVR',
        instructions: 'Please mention your Booking Reference ID in the transfer remarks/memo.'
      }
    }
  },
  {
    id: 'tenant-2',
    name: 'Velidhoo Island Cinema Hall',
    slug: 'noonu-velidhoo-hall',
    tenantCode: 'VEL-02',
    tier: 'paid',
    status: 'active',
    ownerEmail: 'council@velidhoo.gov.mv',
    subscriptionModel: 'yearly', // 1-Year Annual Pass
    subscriptionPriceMvr: 499,
    subscriptionBillingDate: new Date(Date.now() + 300 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&h=200&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1600&h=600&fit=crop&q=80',
      primaryColor: '#0284c7',
      contactPhone: '+960 656-0043',
      contactViber: '+960 771-4455',
      island: 'Velidhoo',
      atoll: 'Noonu (N)',
      terms: 'Seats held with bank transfer receipts require verification 2 hours before show. Doors open 30 mins early.',
      taglineEn: 'Island Community Cinema & Open Screenings',
      taglineDv: 'ނ. ވެލިދޫ ރަށު ސިނަމާ ހޯލް',
      bankDetails: {
        bankName: 'Bank of Maldives (BML)',
        accountNumber: '7705 3829 2201 002',
        accountName: 'Noonu Velidhoo Island Council',
        currency: 'MVR',
        instructions: 'Transfer through BML Internet Banking or Mobile App to the council cinema account.'
      }
    }
  },
  {
    id: 'tenant-3',
    name: 'Kulhudhuffushi City Theater',
    slug: 'kulhudhuffushi-screen1',
    tenantCode: 'KHD-03',
    tier: 'paid',
    status: 'active',
    ownerEmail: 'theater@kulhudhuffushi.mv',
    subscriptionModel: 'weekly', // Weekly subscription
    subscriptionPriceMvr: 149,
    subscriptionBillingDate: new Date(Date.now() + 6 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200&h=200&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1600&h=600&fit=crop&q=80',
      primaryColor: '#e11d48',
      contactPhone: '+960 652-1199',
      contactViber: '+960 999-3388',
      island: 'Kulhudhuffushi City',
      atoll: 'Haa Dhaalu (HDh)',
      terms: 'Student discounts applicable at ticket box with valid ID. Kids under 3 free.',
      taglineEn: 'Northern Hub Premier Entertainment',
      taglineDv: 'ކުޅުދުއްފުށި ސިޓީ ތިއޭޓަރ',
      bankDetails: {
        bankName: 'Maldives Islamic Bank (MIB)',
        accountNumber: '9901 0029 3311 001',
        accountName: 'Kulhudhuffushi City Theater',
        currency: 'MVR',
        instructions: 'MIB transfer accepted. Enter booking reference as reference.'
      }
    }
  }
];

const INITIAL_HALLS: Hall[] = [
  {
    id: 'hall-1',
    tenantId: 'tenant-1',
    name: 'Olympus Main Auditorium (Shared Hall with 3 Screens)',
    island: "Malé City",
    atoll: 'Kaafu (K)',
    address: 'Majeedhee Magu, Malé 20124',
    contactPhone: '+960 332-2345'
  },
  {
    id: 'hall-2',
    tenantId: 'tenant-1',
    name: 'Olympus Rooftop Screening Lounge',
    island: "Malé City",
    atoll: 'Kaafu (K)',
    address: 'Majeedhee Magu 4th Floor, Malé',
    contactPhone: '+960 332-2346'
  },
  {
    id: 'hall-3',
    tenantId: 'tenant-2',
    name: 'Velidhoo Youth Center Shared Hall',
    island: 'Velidhoo',
    atoll: 'Noonu (N)',
    address: 'Bahaaree Hingun, N. Velidhoo',
    contactPhone: '+960 656-0043'
  }
];

// Helper to generate seat matrix
const generateStandardMatrix = (rowsCount: number, colsCount: number, prefix = ''): SeatConfig[] => {
  const seats: SeatConfig[] = [];
  const rowLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

  for (let r = 0; r < rowsCount; r++) {
    const rowChar = rowLetters[r];
    for (let c = 1; c <= colsCount; c++) {
      let type: SeatType = 'standard';
      if (r === 0) {
        type = 'vip';
      } else if (r === rowsCount - 1 && (c === 1 || c === colsCount)) {
        type = 'accessible';
      } else if (r === rowsCount - 2 && (c === 2 || c === 3 || c === colsCount - 2)) {
        type = 'couple';
      }

      seats.push({
        id: prefix ? `${prefix}-${rowChar}${c}` : `${rowChar}-${c}`,
        row: rowChar,
        col: c,
        type: type,
        active: true
      });
    }
  }
  return seats;
};

// 3 SCREENS IN ONE SHARED HALL (Hall 1: Olympus Main Auditorium)
const INITIAL_SCREENS: Screen[] = [
  {
    id: 'screen-1',
    hallId: 'hall-1',
    tenantId: 'tenant-1',
    screenName: 'Screen 1 (Left Wing)',
    screenNumber: 1,
    positionInHall: 'left',
    layout: {
      rows: 5,
      cols: 6,
      rowLabels: ['A', 'B', 'C', 'D', 'E'],
      seats: generateStandardMatrix(5, 6, 'L'),
      screenPosition: 'top',
      stageName: 'SCREEN 1 • LEFT WING'
    }
  },
  {
    id: 'screen-2',
    hallId: 'hall-1',
    tenantId: 'tenant-1',
    screenName: 'Screen 2 (Center Main Stage)',
    screenNumber: 2,
    positionInHall: 'center',
    layout: {
      rows: 6,
      cols: 8,
      rowLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
      seats: generateStandardMatrix(6, 8, 'C'),
      screenPosition: 'top',
      stageName: 'SCREEN 2 • MAIN STAGE (DOLBY)'
    }
  },
  {
    id: 'screen-3',
    hallId: 'hall-1',
    tenantId: 'tenant-1',
    screenName: 'Screen 3 (Right Wing)',
    screenNumber: 3,
    positionInHall: 'right',
    layout: {
      rows: 5,
      cols: 6,
      rowLabels: ['A', 'B', 'C', 'D', 'E'],
      seats: generateStandardMatrix(5, 6, 'R'),
      screenPosition: 'top',
      stageName: 'SCREEN 3 • RIGHT WING'
    }
  },
  {
    id: 'screen-4',
    hallId: 'hall-3',
    tenantId: 'tenant-2',
    screenName: 'Screen A (Community Main)',
    screenNumber: 1,
    positionInHall: 'center',
    layout: {
      rows: 5,
      cols: 8,
      rowLabels: ['A', 'B', 'C', 'D', 'E'],
      seats: generateStandardMatrix(5, 8),
      screenPosition: 'top',
      stageName: 'VELIDHOO MAIN SCREEN'
    }
  }
];

const INITIAL_MOVIES: Movie[] = [
  {
    id: 'movie-1',
    titleEn: 'Kamanaa (The Beloved)',
    titleDv: 'ކަމަނާ',
    synopsisEn: 'A poignant and thrilling Maldivian romantic drama based on real emotional events set against the picturesque backdrop of an isolated southern atoll.',
    synopsisDv: 'ދިވެހިރާއްޖޭގެ އެކަހެރި ރަށެއްގައި ހިނގާދިޔަ ހަގީގީ ހާދިސާއެއްގެ މައްޗަށް ބިނާކޮށް އުފައްދާފައިވާ އަސަރުގަދަ އަދި ޖަޒުބާތީ ފިލްމެއް.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=900&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=900&fit=crop&q=80',
    durationMinutes: 135,
    ageRating: 'PG-13',
    trailerYoutubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    cast: ['Yoosuf Shafeeu', 'Mariyam Azza', 'Mohamed Manik', 'Aminath Rishfa'],
    genre: ['Drama', 'Romance', 'Mystery'],
    releaseDate: '2026-08-15',
    published: true
  },
  {
    id: 'movie-2',
    titleEn: 'Boshi (The Coconut Palm)',
    titleDv: 'ބޮށި',
    synopsisEn: 'A high-octane mystery thriller where dark island folklore meets modern investigative drama when a mysterious ship washes ashore in Haa Alif.',
    synopsisDv: 'ހއ. އަތޮޅުގެ ފަޅުރަށަކަށް ލައްގާ ބޭރުގެ ކަނޑުބޯޓަކާއި ގުޅިގެން ފެށޭ ބިރުވެރި ސިއްރުތަކާއި އަޖައިބުކުރަނިވި ހަގީގަތްތައް.',
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&h=900&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&h=900&fit=crop&q=80',
    durationMinutes: 118,
    ageRating: '15+',
    trailerYoutubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    cast: ['Ali Seezan', 'Niuma Mohamed', 'Jumayyil Nimal'],
    genre: ['Thriller', 'Crime', 'Folklore'],
    releaseDate: '2026-09-01',
    published: true
  },
  {
    id: 'movie-3',
    titleEn: 'Loabi Vevijjeya (Fall in Love)',
    titleDv: 'ލޯބި ވެވިއްޖެޔާ',
    synopsisEn: 'A heartwarming musical comedy about an island youth trying to win the heart of a visiting teacher before the monsoon season ends.',
    synopsisDv: 'ހިތްގައިމު ރާގުތަކާއި މަޖާ ހާދިސާތަކުން ފުރިގެންވާ ދިވެހި މިއުޒިކަލް ކޮމެޑީ ފިލްމު.',
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=900&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1516307365426-bea591f05011?w=1600&h=900&fit=crop&q=80',
    durationMinutes: 125,
    ageRating: 'G',
    trailerYoutubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    cast: ['Ahmed Easa', 'Fathimath Fareela', 'Ravee Farooq'],
    genre: ['Musical', 'Comedy', 'Family'],
    releaseDate: '2026-09-20',
    published: true
  }
];

const getTodayStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const INITIAL_SHOWTIMES: Showtime[] = [
  {
    id: 'show-1',
    movieId: 'movie-1',
    screenId: 'screen-2', // Center Screen in shared hall
    hallId: 'hall-1',
    tenantId: 'tenant-1',
    date: getTodayStr(0),
    startTime: '20:30',
    endTime: '22:45',
    priceTiers: { standard: 100, vip: 150, couple: 250, accessible: 80 },
    status: 'scheduled'
  },
  {
    id: 'show-2',
    movieId: 'movie-2',
    screenId: 'screen-1', // Left Wing Screen in shared hall
    hallId: 'hall-1',
    tenantId: 'tenant-1',
    date: getTodayStr(0),
    startTime: '21:00',
    endTime: '23:00',
    priceTiers: { standard: 90, vip: 140, couple: 220, accessible: 70 },
    status: 'scheduled'
  },
  {
    id: 'show-3',
    movieId: 'movie-3',
    screenId: 'screen-3', // Right Wing Screen in shared hall
    hallId: 'hall-1',
    tenantId: 'tenant-1',
    date: getTodayStr(0),
    startTime: '21:15',
    endTime: '23:20',
    priceTiers: { standard: 90, vip: 140, couple: 220, accessible: 70 },
    status: 'scheduled'
  },
  {
    id: 'show-4',
    movieId: 'movie-3',
    screenId: 'screen-4',
    hallId: 'hall-3',
    tenantId: 'tenant-2',
    date: getTodayStr(0),
    startTime: '20:45',
    endTime: '22:50',
    priceTiers: { standard: 75, vip: 120, couple: 180, accessible: 60 },
    status: 'scheduled'
  }
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'booking-seed-1',
    bookingRef: 'MV-7749-O',
    showtimeId: 'show-1',
    tenantId: 'tenant-1',
    guestName: 'Hassan Fayaz',
    guestEmail: 'hassan.fayaz@gmail.com',
    guestPhone: '+960 7914421',
    seats: [
      { seatId: 'C-C3', row: 'C', col: 3, label: 'C-C3', type: 'standard', price: 100 },
      { seatId: 'C-C4', row: 'C', col: 4, label: 'C-C4', type: 'standard', price: 100 }
    ],
    totalAmount: 200,
    paymentMethod: 'bml_gateway',
    paymentStatus: 'paid',
    qrCodeHash: 'SIG-MV-7749-O-VERIFIED-HASH-2026',
    checkedIn: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const INITIAL_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    type: 'payment',
    tenantId: 'tenant-1',
    message: 'Monthly SaaS subscription active: MVR 249.00/month for Olympus Cinema Malé (No ticket commission charged)',
    details: 'Plan: Paid Monthly | Multi-screen hall enabled',
    status: 'success',
    timestamp: new Date(Date.now() - 3550000).toISOString()
  },
  {
    id: 'log-2',
    type: 'tenant',
    tenantId: 'tenant-1',
    message: 'Hall 1 configured with 3 screens in shared auditorium: Screen 1 (Left), Screen 2 (Center), Screen 3 (Right)',
    status: 'info',
    timestamp: new Date(Date.now() - 3540000).toISOString()
  }
];

// Helper to set cookie shared across apex domain and all subdomains (*.cinemamv.online)
function setCrossDomainCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  try {
    const host = window.location.hostname;
    let domainAttr = '';
    if (host.includes('cinemamv.online')) {
      domainAttr = '; domain=.cinemamv.online';
    } else if (host.includes('.') && !host.endsWith('.localhost') && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const parts = host.split('.');
      if (parts.length >= 2) {
        domainAttr = `; domain=.${parts.slice(-2).join('.')}`;
      }
    }
    const encoded = encodeURIComponent(value);
    document.cookie = `${name}=${encoded}; path=/; max-age=31536000; SameSite=Lax${domainAttr}`;
  } catch (e) {
    console.warn('Failed to set cross-domain cookie:', e);
  }
}

function getCrossDomainCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const prefix = `${name}=`;
    const parts = document.cookie.split(';');
    for (let part of parts) {
      part = part.trim();
      if (part.startsWith(prefix)) {
        return decodeURIComponent(part.substring(prefix.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeTenantsForCookie(tenants: Tenant[]): any[] {
  // CRITICAL: NEVER include the 4KB of unchanged default initial tenants in the cookie!
  // Filter ONLY to custom tenants (e.g. test1) or modified default tenants.
  const defaultIds = new Set(['tenant-1', 'tenant-2', 'tenant-3']);
  const customOrModified = tenants.filter(t => {
    if (!defaultIds.has(t.id)) return true;
    const defaultOriginal = INITIAL_TENANTS.find(x => x.id === t.id);
    return defaultOriginal && (t.slug !== defaultOriginal.slug || t.name !== defaultOriginal.name);
  });

  return customOrModified.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    tenantCode: t.tenantCode,
    tier: t.tier,
    status: t.status,
    subscriptionModel: t.subscriptionModel,
    subscriptionPriceMvr: t.subscriptionPriceMvr,
    ownerEmail: t.ownerEmail,
    branding: {
      island: t.branding?.island || 'Malé',
      atoll: t.branding?.atoll || 'Kaafu',
      contactPhone: t.branding?.contactPhone || '',
      contactViber: t.branding?.contactViber || '',
      logoUrl: t.branding?.logoUrl?.startsWith('data:') ? '' : (t.branding?.logoUrl || ''),
      bannerUrl: t.branding?.bannerUrl?.startsWith('data:') ? '' : (t.branding?.bannerUrl || ''),
      terms: t.branding?.terms || '',
      taglineEn: t.branding?.taglineEn || '',
      taglineDv: t.branding?.taglineDv || ''
    }
  }));
}

// In-Memory & LocalStorage Sync Store
class MaldivianCinemaStore {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();
  private supabaseSyncing = false;

  constructor() {
    this.initDefaults();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('mv_cinema_realtime_bus_v2');
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC') {
          this.notifyListeners();
        }
      };
    }
    // Asynchronously sync from Supabase if configured
    this.syncFromSupabase();
  }

  private getDeletedTombstones(): { movies: string[]; showtimes: string[] } {
    try {
      let data = localStorage.getItem('mv_cinemamv_tombstones_v1');
      if (!data) {
        data = getCrossDomainCookie('mv_cinemamv_tombstones_v1');
        if (data) {
          localStorage.setItem('mv_cinemamv_tombstones_v1', data);
        }
      }
      return data ? JSON.parse(data) : { movies: [], showtimes: [] };
    } catch {
      return { movies: [], showtimes: [] };
    }
  }

  private addDeletedTombstone(type: 'movie' | 'showtime', id: string) {
    try {
      const ts = this.getDeletedTombstones();
      if (type === 'movie' && !ts.movies.includes(id)) {
        ts.movies.push(id);
      } else if (type === 'showtime' && !ts.showtimes.includes(id)) {
        ts.showtimes.push(id);
      }
      const serialized = JSON.stringify(ts);
      localStorage.setItem('mv_cinemamv_tombstones_v1', serialized);
      setCrossDomainCookie('mv_cinemamv_tombstones_v1', serialized);
    } catch {}
  }

  private initDefaults() {
    if (typeof window === 'undefined') return;
    const tombstones = this.getDeletedTombstones();

    let initialTenants = INITIAL_TENANTS;
    const cookieTenants = getCrossDomainCookie('mv_cinemamv_tenants_v1');
    if (cookieTenants) {
      try {
        const parsed: Tenant[] = JSON.parse(cookieTenants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...INITIAL_TENANTS];
          parsed.forEach((pt) => {
            const idx = merged.findIndex(x => x.id === pt.id || x.slug.toLowerCase() === pt.slug.toLowerCase());
            if (idx >= 0) merged[idx] = pt;
            else merged.push(pt);
          });
          initialTenants = merged;
        }
      } catch {}
    }

    if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(initialTenants));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HALLS)) {
      let hallsToSave = INITIAL_HALLS;
      const cookieHalls = getCrossDomainCookie('mv_cinemamv_halls_v1');
      if (cookieHalls) {
        try {
          const parsed = JSON.parse(cookieHalls);
          if (Array.isArray(parsed) && parsed.length > 0) hallsToSave = parsed;
        } catch {}
      }
      localStorage.setItem(STORAGE_KEYS.HALLS, JSON.stringify(hallsToSave));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCREENS)) {
      let screensToSave = INITIAL_SCREENS;
      const cookieScreens = getCrossDomainCookie('mv_cinemamv_screens_v1');
      if (cookieScreens) {
        try {
          const parsed = JSON.parse(cookieScreens);
          if (Array.isArray(parsed) && parsed.length > 0) screensToSave = parsed;
        } catch {}
      }
      localStorage.setItem(STORAGE_KEYS.SCREENS, JSON.stringify(screensToSave));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVIES)) {
      const filteredMovies = INITIAL_MOVIES.filter(m => !tombstones.movies.includes(m.id));
      localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(filteredMovies));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SHOWTIMES)) {
      const filteredShowtimes = INITIAL_SHOWTIMES.filter(s => !tombstones.showtimes.includes(s.id));
      localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(filteredShowtimes));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS)) {
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SYSTEM_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_LOGS, JSON.stringify(INITIAL_LOGS));
    }
  }

  public async syncFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured() || this.supabaseSyncing) return;
    this.supabaseSyncing = true;
    try {
      // 1. Fetch remote movies
      const { data: mvRows, error: mvErr } = await supabase.from('movies').select('*');
      if (!mvErr && mvRows && mvRows.length > 0) {
        const remoteMovies = mvRows.map(mapMovieFromDb);
        localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(remoteMovies));
      }

      // 2. Fetch remote showtimes
      const { data: stRows, error: stErr } = await supabase.from('showtimes').select('*');
      if (!stErr && stRows && stRows.length > 0) {
        const remoteShowtimes = stRows.map(mapShowtimeFromDb);
        localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(remoteShowtimes));
      }

      // 3. Fetch remote tenants
      const { data: tnRows, error: tnErr } = await supabase.from('tenants').select('*');
      if (!tnErr && tnRows && tnRows.length > 0) {
        const remoteTenants = tnRows.map(mapTenantFromDb);
        localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(remoteTenants));
      }

      // 4. Fetch remote halls
      const { data: hlRows, error: hlErr } = await supabase.from('halls').select('*');
      if (!hlErr && hlRows && hlRows.length > 0) {
        const remoteHalls = hlRows.map((h: any) => ({
          id: h.id,
          tenantId: h.tenant_id,
          name: h.name,
          island: h.island,
          atoll: h.atoll,
          address: h.address || '',
          contactPhone: h.contact_phone || ''
        }));
        localStorage.setItem(STORAGE_KEYS.HALLS, JSON.stringify(remoteHalls));
      }

      // 5. Fetch remote screens
      const { data: scRows, error: scErr } = await supabase.from('screens').select('*');
      if (!scErr && scRows && scRows.length > 0) {
        const remoteScreens = scRows.map((s: any) => ({
          id: s.id,
          hallId: s.hall_id,
          tenantId: s.tenant_id,
          screenName: s.screen_name,
          screenNumber: s.screen_number || 1,
          positionInHall: s.position_in_hall || 'center',
          layout: s.layout
        }));
        localStorage.setItem(STORAGE_KEYS.SCREENS, JSON.stringify(remoteScreens));
      }

      this.notifyListeners();
    } catch (e) {
      console.warn('Supabase remote sync failed / offline fallback used:', e);
    } finally {
      this.supabaseSyncing = false;
    }
  }

  public importSyncPayload(payload: any): boolean {
    if (!payload) return false;
    let changed = false;
    try {
      if (payload.tenants) {
        const incomingTenants: Tenant[] = JSON.parse(payload.tenants);
        if (Array.isArray(incomingTenants)) {
          const current = this.getTenants();
          incomingTenants.forEach((it) => {
            const idx = current.findIndex(x => x.id === it.id || x.slug.toLowerCase() === it.slug.toLowerCase());
            if (idx >= 0) {
              current[idx] = { ...current[idx], ...it };
            } else {
              current.push(it);
            }
          });
          localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(current));
          changed = true;
        }
      }
      if (payload.halls) {
        localStorage.setItem(STORAGE_KEYS.HALLS, payload.halls);
        changed = true;
      }
      if (payload.screens) {
        localStorage.setItem(STORAGE_KEYS.SCREENS, payload.screens);
        changed = true;
      }
      if (payload.showtimes) {
        localStorage.setItem(STORAGE_KEYS.SHOWTIMES, payload.showtimes);
        changed = true;
      }
      if (payload.movies) {
        localStorage.setItem(STORAGE_KEYS.MOVIES, payload.movies);
        changed = true;
      }
      if (payload.tombstones) {
        localStorage.setItem('mv_cinemamv_tombstones_v1', payload.tombstones);
        changed = true;
      }
      if (changed) {
        this.broadcastSync();
      }
      return changed;
    } catch {
      return false;
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  private broadcastSync() {
    this.notifyListeners();
    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC', timestamp: Date.now() });
    }
  }

  // --- TENANTS & SUBSCRIPTIONS ---
  public checkAndExpireSubscriptions(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TENANTS);
      if (!data) return false;
      const list: Tenant[] = JSON.parse(data);
      let changed = false;
      const now = Date.now();

      list.forEach((t) => {
        if (t.tier === 'paid' && t.subscriptionBillingDate) {
          const expiryTime = new Date(t.subscriptionBillingDate).getTime();
          if (expiryTime <= now) {
            t.tier = 'free';
            t.subscriptionModel = 'free_trial';
            t.subscriptionPriceMvr = 0;
            changed = true;

            this.addLog({
              id: `log-${Date.now()}-${t.id}-expired`,
              type: 'tenant',
              tenantId: t.id,
              message: `Tenant "${t.name}" (${t.tenantCode}) subscription expired. Automatically fallen back to Free Tier with restricted Pro features.`,
              details: `Expired at ${new Date(t.subscriptionBillingDate).toLocaleString()}. Pro features restricted (1 Hall, 1 Screen, up to 100 seats access, random domain).`,
              status: 'warning',
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));
      }
      return changed;
    } catch {
      return false;
    }
  }

  public expireTenantNow(tenantId: string): void {
    const list = this.getTenants();
    const t = list.find((x) => x.id === tenantId);
    if (t) {
      t.subscriptionBillingDate = new Date(Date.now() - 60000).toISOString();
      t.tier = 'free';
      t.subscriptionModel = 'free_trial';
      t.subscriptionPriceMvr = 0;
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));
      this.addLog({
        id: `log-${Date.now()}-${t.id}-forced-expiry`,
        type: 'tenant',
        tenantId: t.id,
        message: `Tenant "${t.name}" (${t.tenantCode}) expired by Super Admin. Automatically fallen back to Free Tier.`,
        status: 'warning',
        timestamp: new Date().toISOString()
      });
      this.broadcastSync();
    }
  }

  public getTenants(): Tenant[] {
    try {
      this.checkAndExpireSubscriptions();
      let data = localStorage.getItem(STORAGE_KEYS.TENANTS);
      let list: Tenant[] = data ? JSON.parse(data) : INITIAL_TENANTS;

      // Always merge cross-domain cookie tenants for seamless subdomains
      const cookieData = getCrossDomainCookie('mv_cinemamv_tenants_v1');
      if (cookieData) {
        try {
          const cookieList: Tenant[] = JSON.parse(cookieData);
          if (Array.isArray(cookieList)) {
            let changed = false;
            cookieList.forEach((ct) => {
              const idx = list.findIndex((x) => x.id === ct.id || x.slug.toLowerCase() === ct.slug.toLowerCase());
              if (idx >= 0) {
                if (list[idx].slug !== ct.slug || list[idx].name !== ct.name || JSON.stringify(list[idx].branding) !== JSON.stringify(ct.branding)) {
                  list[idx] = { ...list[idx], ...ct };
                  changed = true;
                }
              } else {
                list.push(ct);
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));
            }
          }
        } catch {}
      }

      let updated = false;
      list.forEach((t) => {
        if (t.subscriptionModel === 'monthly' && t.subscriptionPriceMvr !== 249) {
          t.subscriptionPriceMvr = 249;
          updated = true;
        }
        if (t.subscriptionModel === 'one_month' || t.subscriptionModel === 'yearly') {
          t.subscriptionModel = 'yearly';
          if (t.subscriptionPriceMvr !== 499) {
            t.subscriptionPriceMvr = 499;
            updated = true;
          }
        }
      });
      if (updated) {
        localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_TENANTS;
    }
  }

  public getTenantBySlug(slug: string): Tenant | undefined {
    return this.getTenants().find((t) => t.slug.toLowerCase() === slug.toLowerCase());
  }

  public isSlugAvailable(slug: string, excludeTenantId?: string): boolean {
    const clean = slug.trim().toLowerCase();
    if (!clean) return false;
    const existing = this.getTenants().find((t) => t.slug.toLowerCase() === clean);
    if (!existing) return true;
    return existing.id === excludeTenantId;
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.getTenants().find((t) => t.id === id);
  }

  public saveTenant(tenant: Tenant): void {
    const list = this.getTenants();
    const idx = list.findIndex((t) => t.id === tenant.id);
    if (idx >= 0) {
      list[idx] = tenant;
    } else {
      list.push(tenant);
    }
    const serialized = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEYS.TENANTS, serialized);
    setCrossDomainCookie('mv_cinemamv_tenants_v1', JSON.stringify(sanitizeTenantsForCookie(list)));

    if (isSupabaseConfigured()) {
      supabase.from('tenants').upsert({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tier: tenant.tier,
        status: tenant.status,
        branding: tenant.branding,
        owner_email: tenant.ownerEmail
      }).then(({ error }) => {
        if (error) console.warn('Supabase saveTenant error:', error);
      });
    }

    this.addLog({
      id: `log-${Date.now()}`,
      type: 'tenant',
      tenantId: tenant.id,
      message: `Tenant "${tenant.name}" profile, branding, and bank details saved`,
      status: 'info',
      timestamp: new Date().toISOString()
    });
    this.broadcastSync();
  }

  public updateTenantSubscription(
    tenantId: string, 
    model: 'weekly' | 'monthly' | 'yearly' | 'one_month' | 'free_trial', 
    priceMvr?: number
  ): void {
    const list = this.getTenants();
    const tenant = list.find((t) => t.id === tenantId);
    if (tenant) {
      tenant.subscriptionModel = (model === 'one_month' ? 'yearly' : model) as any;
      tenant.tier = model === 'free_trial' ? 'free' : 'paid';

      if (priceMvr !== undefined) {
        tenant.subscriptionPriceMvr = priceMvr;
      } else {
        if (model === 'weekly') tenant.subscriptionPriceMvr = 149;
        else if (model === 'monthly') tenant.subscriptionPriceMvr = 249;
        else if (model === 'yearly' || model === 'one_month') tenant.subscriptionPriceMvr = 499;
        else tenant.subscriptionPriceMvr = 0;
      }

      const daysToAdd = model === 'weekly' ? 7 : (model === 'yearly' || model === 'one_month') ? 365 : 30;
      tenant.subscriptionBillingDate = new Date(Date.now() + daysToAdd * 86400000).toISOString();
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));

      if (isSupabaseConfigured()) {
        supabase.from('tenants').upsert({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          tier: tenant.tier,
          status: tenant.status,
          branding: { ...tenant.branding, subscriptionModel: tenant.subscriptionModel, subscriptionPriceMvr: tenant.subscriptionPriceMvr, subscriptionBillingDate: tenant.subscriptionBillingDate },
          owner_email: tenant.ownerEmail
        }).then(({ error }) => {
          if (error) console.warn('Supabase updateTenantSubscription error:', error);
        });
      }

      this.addLog({
        id: `log-${Date.now()}`,
        type: 'tenant',
        tenantId,
        message: `Tenant "${tenant.name}" subscription updated to ${model.toUpperCase()} (MVR ${tenant.subscriptionPriceMvr}). No ticket fees charged.`,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      this.broadcastSync();
    }
  }

  public updateTenantStatus(tenantId: string, status: 'active' | 'suspended'): void {
    const list = this.getTenants();
    const tenant = list.find((t) => t.id === tenantId);
    if (tenant) {
      tenant.status = status;
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));

      if (isSupabaseConfigured()) {
        supabase.from('tenants').update({ status }).eq('id', tenantId).then(({ error }) => {
          if (error) console.warn('Supabase updateTenantStatus error:', error);
        });
      }

      this.addLog({
        id: `log-${Date.now()}`,
        type: 'tenant',
        tenantId,
        message: `Tenant "${tenant.name}" status changed to ${status.toUpperCase()}`,
        status: status === 'active' ? 'success' : 'warning',
        timestamp: new Date().toISOString()
      });
      this.broadcastSync();
    }
  }

  public deleteTenant(tenantId: string): void {
    const list = this.getTenants();
    const tenant = list.find((t) => t.id === tenantId);
    if (!tenant) return;

    // Delete tenant
    const updatedTenants = list.filter((t) => t.id !== tenantId);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(updatedTenants));

    // Delete all linked halls, screens, showtimes, movies
    try {
      const halls = this.getHalls().filter((h) => h.tenantId !== tenantId);
      localStorage.setItem(STORAGE_KEYS.HALLS, JSON.stringify(halls));

      const screens = this.getScreens().filter((s) => s.tenantId !== tenantId);
      localStorage.setItem(STORAGE_KEYS.SCREENS, JSON.stringify(screens));

      const showtimes = this.getShowtimes().filter((st) => st.tenantId !== tenantId);
      localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(showtimes));

      const movies = this.getMovies().filter((m) => m.tenantId !== tenantId);
      localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
    } catch {}

    if (isSupabaseConfigured()) {
      supabase.from('tenants').delete().eq('id', tenantId).then(({ error }) => {
        if (error) console.warn('Supabase deleteTenant error:', error);
      });
    }

    this.addLog({
      id: `log-${Date.now()}-del`,
      type: 'tenant',
      tenantId,
      message: `Tenant "${tenant.name}" (${tenant.tenantCode}) permanently deleted by Super Admin`,
      details: 'All associated halls, screens, showtimes and portal routes purged.',
      status: 'warning',
      timestamp: new Date().toISOString()
    });

    this.broadcastSync();
  }

  public purchaseCinemaSlot(
    ownerEmail: string,
    cinemaData: { name: string; island: string; atoll: string; contactPhone?: string }
  ): Tenant {
    const list = this.getTenants();
    const existing = list.filter((t) => t.ownerEmail.toLowerCase() === ownerEmail.toLowerCase());
    const newSlotCount = existing.length + 1;

    existing.forEach((t) => {
      t.cinemaSlots = newSlotCount;
    });

    const tenantCode = `CIN-${cinemaData.island.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    const baseSlug = cinemaData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cinema-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    while (list.some((t) => t.slug.toLowerCase() === slug.toLowerCase())) {
      slug = `${baseSlug}-${counter++}`;
    }

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: cinemaData.name,
      slug,
      tenantCode,
      tier: 'paid',
      status: 'active',
      ownerEmail,
      cinemaSlots: newSlotCount,
      subscriptionModel: 'monthly',
      subscriptionPriceMvr: 249,
      subscriptionBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      branding: {
        logoUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=200&h=200&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=600&fit=crop&q=80',
        primaryColor: '#0d9488',
        contactPhone: cinemaData.contactPhone || '+960 777-1234',
        contactViber: cinemaData.contactPhone || '+960 777-1234',
        island: cinemaData.island,
        atoll: cinemaData.atoll,
        terms: 'Tickets are non-refundable. Please arrive 15 minutes before showtime.',
        taglineEn: 'Island Cinema & Entertainment Screen',
        taglineDv: 'ދިވެހި ރާއްޖޭގެ ރަށްރަށުގެ ސިނަމާ',
        bankDetails: {
          bankName: 'Bank of Maldives (BML)',
          accountNumber: '7701 0000 0000 001',
          accountName: `${cinemaData.name} Pvt Ltd`,
          currency: 'MVR',
          instructions: 'Please mention your booking reference in remarks/memo.'
        }
      }
    };

    list.push(newTenant);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(list));

    const defaultHall: Hall = {
      id: `hall-${Date.now()}`,
      tenantId: newTenant.id,
      name: `${cinemaData.name} Main Hall`,
      island: cinemaData.island,
      atoll: cinemaData.atoll,
      address: `${cinemaData.island}, Maldives`,
      contactPhone: cinemaData.contactPhone || '+960 777-1234'
    };
    this.saveHall(defaultHall);

    const defaultScreen: Screen = {
      id: `screen-${Date.now()}`,
      hallId: defaultHall.id,
      tenantId: newTenant.id,
      screenName: 'Screen 1 (Main Screen)',
      positionInHall: 'center',
      layout: {
        rows: 8,
        cols: 12,
        rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        seats: generateStandardMatrix(8, 12, 'S1'),
        screenPosition: 'top',
        stageName: `${cinemaData.name.toUpperCase()} MAIN SCREEN`
      }
    };
    this.saveScreen(defaultScreen);

    this.addLog({
      id: `log-${Date.now()}-slot`,
      type: 'tenant',
      tenantId: newTenant.id,
      message: `Additional Cinema Slot Purchased by ${ownerEmail}: "${newTenant.name}" (${newTenant.tenantCode})`,
      details: `Slots Expanded: ${newSlotCount} / ${newSlotCount} Cinemas. Plan: Monthly MVR 249.`,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    this.broadcastSync();
    return newTenant;
  }

  // --- HALLS ---
  public getHalls(tenantId?: string): Hall[] {
    try {
      let data = localStorage.getItem(STORAGE_KEYS.HALLS);
      if (!data) {
        const cookieHalls = getCrossDomainCookie('mv_cinemamv_halls_v1');
        if (cookieHalls) {
          data = cookieHalls;
          localStorage.setItem(STORAGE_KEYS.HALLS, cookieHalls);
        }
      }
      let list: Hall[] = data ? JSON.parse(data) : INITIAL_HALLS;
      const cookieHalls = getCrossDomainCookie('mv_cinemamv_halls_v1');
      if (cookieHalls) {
        try {
          const cList: Hall[] = JSON.parse(cookieHalls);
          cList.forEach((ch) => {
            if (!list.some(x => x.id === ch.id)) list.push(ch);
          });
        } catch {}
      }
      return tenantId ? list.filter((h) => h.tenantId === tenantId) : list;
    } catch {
      return INITIAL_HALLS;
    }
  }

  public getHallById(id: string): Hall | undefined {
    return this.getHalls().find((h) => h.id === id);
  }

  public saveHall(hall: Hall): void {
    const list = this.getHalls();
    const idx = list.findIndex((h) => h.id === hall.id);
    if (idx >= 0) {
      list[idx] = hall;
    } else {
      list.push(hall);
    }
    const serialized = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEYS.HALLS, serialized);
    setCrossDomainCookie('mv_cinemamv_halls_v1', serialized);
    this.broadcastSync();
  }

  // --- SCREENS (MULTIPLE SCREENS PER HALL) ---
  public getScreens(hallId?: string): Screen[] {
    try {
      let data = localStorage.getItem(STORAGE_KEYS.SCREENS);
      if (!data) {
        const cookieScreens = getCrossDomainCookie('mv_cinemamv_screens_v1');
        if (cookieScreens) {
          data = cookieScreens;
          localStorage.setItem(STORAGE_KEYS.SCREENS, cookieScreens);
        }
      }
      let list: Screen[] = data ? JSON.parse(data) : INITIAL_SCREENS;
      const cookieScreens = getCrossDomainCookie('mv_cinemamv_screens_v1');
      if (cookieScreens) {
        try {
          const cList: Screen[] = JSON.parse(cookieScreens);
          cList.forEach((cs) => {
            if (!list.some(x => x.id === cs.id)) list.push(cs);
          });
        } catch {}
      }
      return hallId ? list.filter((s) => s.hallId === hallId) : list;
    } catch {
      return INITIAL_SCREENS;
    }
  }

  public getScreenById(id: string): Screen | undefined {
    return this.getScreens().find((s) => s.id === id);
  }

  public saveScreen(screen: Screen): void {
    const list = this.getScreens();
    const idx = list.findIndex((s) => s.id === screen.id);
    if (idx >= 0) {
      list[idx] = screen;
    } else {
      list.push(screen);
    }
    const serialized = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEYS.SCREENS, serialized);
    setCrossDomainCookie('mv_cinemamv_screens_v1', serialized);

    if (isSupabaseConfigured()) {
      supabase.from('screens').upsert({
        id: screen.id,
        hall_id: screen.hallId,
        tenant_id: screen.tenantId,
        screen_name: screen.screenName,
        screen_number: screen.screenNumber || 1,
        position_in_hall: screen.positionInHall,
        layout: screen.layout
      }).then(({ error }) => {
        if (error) console.warn('Supabase saveScreen error:', error);
      });
    }

    this.broadcastSync();
  }

  public deleteScreen(screenId: string): void {
    let list = this.getScreens();
    list = list.filter((s) => s.id !== screenId);
    localStorage.setItem(STORAGE_KEYS.SCREENS, JSON.stringify(list));

    // Also remove any showtimes linked to this deleted screen
    let showtimes = this.getShowtimes();
    showtimes = showtimes.filter((st) => st.screenId !== screenId);
    localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(showtimes));

    if (isSupabaseConfigured()) {
      supabase.from('screens').delete().eq('id', screenId).then(({ error }) => {
        if (error) console.warn('Supabase deleteScreen error:', error);
      });
    }

    this.broadcastSync();
  }

  // --- MOVIES ---
  public getMovies(tenantId?: string): Movie[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOVIES);
      const tombstones = this.getDeletedTombstones();
      let list: Movie[] = data ? JSON.parse(data) : INITIAL_MOVIES;
      // Filter out any tombstoned/deleted movies
      list = list.filter((m) => !tombstones.movies.includes(m.id));
      if (tenantId) {
        const tenantShowtimes = this.getShowtimes(tenantId);
        const activeMovieIds = new Set(tenantShowtimes.map((st) => st.movieId));
        return list.filter((m) => m.tenantId === tenantId || activeMovieIds.has(m.id));
      }
      return list;
    } catch {
      return INITIAL_MOVIES;
    }
  }

  public getMovieById(id: string): Movie | undefined {
    return this.getMovies().find((m) => m.id === id);
  }

  public saveMovie(movie: Movie): void {
    const list = this.getMovies();
    const idx = list.findIndex((m) => m.id === movie.id);
    if (idx >= 0) {
      list[idx] = movie;
    } else {
      list.push(movie);
    }
    localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(list));

    if (isSupabaseConfigured()) {
      supabase.from('movies').upsert({
        id: movie.id,
        tenant_id: movie.tenantId || null,
        title_en: movie.titleEn,
        title_dv: movie.titleDv,
        synopsis_en: movie.synopsisEn,
        synopsis_dv: movie.synopsisDv,
        poster_url: movie.posterUrl,
        backdrop_url: movie.backdropUrl,
        duration_minutes: movie.durationMinutes,
        age_rating: movie.ageRating,
        trailer_youtube_url: movie.trailerYoutubeUrl,
        cast_members: movie.cast,
        genres: movie.genre,
        release_date: movie.releaseDate
      }).then(({ error }) => {
        if (error) console.warn('Supabase saveMovie error:', error);
      });
    }

    this.addLog({
      id: `log-${Date.now()}`,
      type: 'tenant',
      tenantId: movie.tenantId,
      message: `Movie "${movie.titleEn}" artwork and details updated`,
      status: 'info',
      timestamp: new Date().toISOString()
    });
    this.broadcastSync();
  }

  public deleteMovie(movieId: string): void {
    let list = this.getMovies();
    list = list.filter((m) => m.id !== movieId);
    localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(list));

    // Record tombstone so it never re-seeds in fresh browser sessions
    this.addDeletedTombstone('movie', movieId);

    // Clean up showtimes for this movie
    let showtimes = this.getShowtimes();
    showtimes = showtimes.filter((st) => st.movieId !== movieId);
    localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(showtimes));

    if (isSupabaseConfigured()) {
      supabase.from('movies').delete().eq('id', movieId).then(({ error }) => {
        if (error) console.warn('Supabase deleteMovie error:', error);
      });
      supabase.from('showtimes').delete().eq('movie_id', movieId).then(({ error }) => {
        if (error) console.warn('Supabase deleteShowtimes for movie error:', error);
      });
    }

    this.broadcastSync();
  }

  public toggleMoviePublish(movieId: string): boolean {
    const list = this.getMovies();
    const movie = list.find((m) => m.id === movieId);
    if (!movie) return false;
    movie.published = movie.published === false ? true : false;
    localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(list));

    if (isSupabaseConfigured()) {
      supabase.from('movies').update({ published: movie.published }).eq('id', movieId).then(({ error }) => {
        if (error) console.warn('Supabase toggleMoviePublish error:', error);
      });
    }

    this.addLog({
      id: `log-${Date.now()}`,
      type: 'tenant',
      tenantId: movie.tenantId,
      message: `Movie "${movie.titleEn}" status changed to ${movie.published ? 'Live / Published' : 'Private / Draft'}`,
      status: 'info',
      timestamp: new Date().toISOString()
    });
    this.broadcastSync();
    return movie.published;
  }

  // --- SHOWTIMES (WITH CANCEL AND DELETE OPTIONS) ---
  public getShowtimes(tenantId?: string): Showtime[] {
    try {
      let data = localStorage.getItem(STORAGE_KEYS.SHOWTIMES);
      const tombstones = this.getDeletedTombstones();
      if (!data) {
        const cookieShowtimes = getCrossDomainCookie('mv_cinemamv_showtimes_v1');
        if (cookieShowtimes) {
          data = cookieShowtimes;
          localStorage.setItem(STORAGE_KEYS.SHOWTIMES, cookieShowtimes);
        }
      }
      let list: Showtime[] = data ? JSON.parse(data) : INITIAL_SHOWTIMES;
      const cookieShowtimes = getCrossDomainCookie('mv_cinemamv_showtimes_v1');
      if (cookieShowtimes) {
        try {
          const cList: Showtime[] = JSON.parse(cookieShowtimes);
          cList.forEach((cs) => {
            if (!list.some(x => x.id === cs.id)) list.push(cs);
          });
        } catch {}
      }
      list = list.filter((st) => !tombstones.showtimes.includes(st.id) && !tombstones.movies.includes(st.movieId));
      return tenantId ? list.filter((s) => s.tenantId === tenantId) : list;
    } catch {
      return INITIAL_SHOWTIMES;
    }
  }

  public getShowtimeById(id: string): Showtime | undefined {
    return this.getShowtimes().find((s) => s.id === id);
  }

  public saveShowtime(showtime: Showtime): void {
    const list = this.getShowtimes();
    const idx = list.findIndex((s) => s.id === showtime.id);
    if (idx >= 0) {
      list[idx] = showtime;
    } else {
      list.push(showtime);
    }
    const serialized = JSON.stringify(list);
    localStorage.setItem(STORAGE_KEYS.SHOWTIMES, serialized);
    setCrossDomainCookie('mv_cinemamv_showtimes_v1', serialized);

    if (isSupabaseConfigured()) {
      supabase.from('showtimes').upsert({
        id: showtime.id,
        movie_id: showtime.movieId,
        screen_id: showtime.screenId,
        hall_id: showtime.hallId,
        tenant_id: showtime.tenantId,
        show_date: showtime.date,
        start_time: showtime.startTime,
        end_time: showtime.endTime,
        price_tiers: showtime.priceTiers,
        status: showtime.status
      }).then(({ error }) => {
        if (error) console.warn('Supabase saveShowtime error:', error);
      });
    }

    this.broadcastSync();
  }

  public cancelShowtime(showtimeId: string): void {
    const list = this.getShowtimes();
    const target = list.find((s) => s.id === showtimeId);
    if (target) {
      target.status = 'cancelled';
      localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(list));

      if (isSupabaseConfigured()) {
        supabase.from('showtimes').update({ status: 'cancelled' }).eq('id', showtimeId).then(({ error }) => {
          if (error) console.warn('Supabase cancelShowtime error:', error);
        });
      }

      this.addLog({
        id: `log-${Date.now()}`,
        type: 'tenant',
        tenantId: target.tenantId,
        message: `Showtime ${target.id} was marked as CANCELLED`,
        details: `Screening on ${target.date} at ${target.startTime} is cancelled.`,
        status: 'warning',
        timestamp: new Date().toISOString()
      });
      this.broadcastSync();
    }
  }

  public deleteShowtime(showtimeId: string): void {
    let list = this.getShowtimes();
    const target = list.find((s) => s.id === showtimeId);
    list = list.filter((s) => s.id !== showtimeId);
    localStorage.setItem(STORAGE_KEYS.SHOWTIMES, JSON.stringify(list));

    // Record tombstone so it never re-seeds in fresh browser sessions
    this.addDeletedTombstone('showtime', showtimeId);

    if (isSupabaseConfigured()) {
      supabase.from('showtimes').delete().eq('id', showtimeId).then(({ error }) => {
        if (error) console.warn('Supabase deleteShowtime error:', error);
      });
    }

    if (target) {
      this.addLog({
        id: `log-${Date.now()}`,
        type: 'tenant',
        tenantId: target.tenantId,
        message: `Showtime ${target.id} permanently deleted from schedule`,
        status: 'warning',
        timestamp: new Date().toISOString()
      });
    }
    this.broadcastSync();
  }

  // --- SEAT HOLDS (10 MINUTE HOLD LOCK) ---
  public getSeatHolds(showtimeId: string): SeatHold[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      const all: SeatHold[] = data ? JSON.parse(data) : [];
      const now = Date.now();
      const active = all.filter((h) => h.expiresAt > now);
      if (active.length !== all.length) {
        localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(active));
      }
      return active.filter((h) => h.showtimeId === showtimeId);
    } catch {
      return [];
    }
  }

  public acquireSeatHold(showtimeId: string, seatId: string, sessionId: string, holdMinutes = 10): boolean {
    const now = Date.now();
    const expiresAt = now + holdMinutes * 60 * 1000;

    const booked = this.getBookedSeatIds(showtimeId);
    if (booked.has(seatId)) {
      return false;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      let all: SeatHold[] = data ? JSON.parse(data) : [];
      all = all.filter((h) => h.expiresAt > now);

      const existingIndex = all.findIndex((h) => h.showtimeId === showtimeId && h.seatId === seatId);
      if (existingIndex >= 0) {
        if (all[existingIndex].sessionId === sessionId) {
          all[existingIndex].expiresAt = expiresAt;
          localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
          this.broadcastSync();
          return true;
        } else {
          return false;
        }
      }

      all.push({
        showtimeId,
        seatId,
        sessionId,
        expiresAt
      });
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
      this.broadcastSync();
      return true;
    } catch {
      return false;
    }
  }

  public releaseSeatHold(showtimeId: string, seatId: string, sessionId: string): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      let all: SeatHold[] = data ? JSON.parse(data) : [];
      all = all.filter((h) => !(h.showtimeId === showtimeId && h.seatId === seatId && h.sessionId === sessionId));
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
      this.broadcastSync();
    } catch {}
  }

  public releaseAllSessionHolds(showtimeId: string, sessionId: string): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      let all: SeatHold[] = data ? JSON.parse(data) : [];
      all = all.filter((h) => !(h.showtimeId === showtimeId && h.sessionId === sessionId));
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
      this.broadcastSync();
    } catch {}
  }

  // --- BOOKINGS & TICKET VALIDATION ---
  public getBookings(tenantId?: string): Booking[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      const list: Booking[] = data ? JSON.parse(data) : INITIAL_BOOKINGS;
      return tenantId ? list.filter((b) => b.tenantId === tenantId) : list;
    } catch {
      return INITIAL_BOOKINGS;
    }
  }

  public getBookingByRef(ref: string): Booking | undefined {
    return this.getBookings().find((b) => b.bookingRef.toUpperCase() === ref.trim().toUpperCase());
  }

  public getBookedSeatIds(showtimeId: string): Set<string> {
    const list = this.getBookings().filter((b) => b.showtimeId === showtimeId && b.paymentStatus !== 'expired');
    const set = new Set<string>();
    list.forEach((b) => {
      b.seats.forEach((s) => set.add(s.seatId));
    });
    return set;
  }

  public createBooking(booking: Booking, sessionId: string): { success: boolean; error?: string } {
    const existingBooked = this.getBookedSeatIds(booking.showtimeId);
    for (const seat of booking.seats) {
      if (existingBooked.has(seat.seatId)) {
        return { success: false, error: `Seat ${seat.label} has already been reserved or booked by another guest.` };
      }
    }

    const list = this.getBookings();
    list.unshift(booking);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));

    this.releaseAllSessionHolds(booking.showtimeId, sessionId);

    this.addLog({
      id: `log-${Date.now()}-pay`,
      type: 'payment',
      tenantId: booking.tenantId,
      message: `Booking ${booking.bookingRef} confirmed: MVR ${booking.totalAmount.toFixed(2)} via ${booking.paymentMethod.toUpperCase()}`,
      details: `Guest: ${booking.guestName} (${booking.guestPhone}) | ${booking.seats.length} seat(s)`,
      status: booking.paymentStatus === 'paid' ? 'success' : 'warning',
      timestamp: new Date().toISOString()
    });

    this.broadcastSync();
    return { success: true };
  }

  public updateBookingPaymentStatus(bookingId: string, status: 'paid' | 'expired'): void {
    const list = this.getBookings();
    const b = list.find((item) => item.id === bookingId);
    if (b) {
      b.paymentStatus = status;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
      this.addLog({
        id: `log-${Date.now()}`,
        type: 'payment',
        tenantId: b.tenantId,
        message: `Booking ${b.bookingRef} transfer marked as ${status.toUpperCase()}`,
        status: status === 'paid' ? 'success' : 'error',
        timestamp: new Date().toISOString()
      });
      this.broadcastSync();
    }
  }

  public validateTicket(qrCodeOrRef: string): { 
    valid: boolean; 
    alreadyCheckedIn: boolean; 
    booking?: Booking; 
    message: string;
    checkedInAt?: string;
  } {
    const term = qrCodeOrRef.trim();
    const booking = this.getBookings().find((b) => b.qrCodeHash === term || b.bookingRef.toUpperCase() === term.toUpperCase());

    if (!booking) {
      return {
        valid: false,
        alreadyCheckedIn: false,
        message: 'Invalid ticket. QR code or Booking Reference does not exist in the system.'
      };
    }

    if (booking.paymentStatus === 'pending_verification') {
      return {
        valid: false,
        alreadyCheckedIn: false,
        booking,
        message: 'Payment verification pending. Transfer receipt must be approved before entry.'
      };
    }

    if (booking.paymentStatus === 'expired') {
      return {
        valid: false,
        alreadyCheckedIn: false,
        booking,
        message: 'Ticket is expired or cancelled.'
      };
    }

    if (booking.checkedIn) {
      return {
        valid: false,
        alreadyCheckedIn: true,
        booking,
        checkedInAt: booking.checkedInAt,
        message: `DUPLICATE ENTRY DETECTED! Already scanned on ${new Date(booking.checkedInAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
    }

    const checkinTime = new Date().toISOString();
    booking.checkedIn = true;
    booking.checkedInAt = checkinTime;

    const list = this.getBookings();
    const idx = list.findIndex((b) => b.id === booking.id);
    if (idx >= 0) list[idx] = booking;
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));

    this.addLog({
      id: `log-${Date.now()}-chk`,
      type: 'checkin',
      tenantId: booking.tenantId,
      message: `Ticket ${booking.bookingRef} validated at entrance door`,
      details: `Gatekeeper checked in ${booking.seats.length} guest(s): ${booking.guestName}`,
      status: 'success',
      timestamp: checkinTime
    });

    this.broadcastSync();
    return {
      valid: true,
      alreadyCheckedIn: false,
      booking,
      checkedInAt: checkinTime,
      message: `ACCESS GRANTED! Welcome ${booking.guestName}. Seat(s): ${booking.seats.map(s => s.label).join(', ')}`
    };
  }

  // --- SYSTEM LOGS ---
  public getSystemLogs(): SystemLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYSTEM_LOGS);
      return data ? JSON.parse(data) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  }

  public addLog(log: SystemLog): void {
    const list = this.getSystemLogs();
    list.unshift(log);
    if (list.length > 150) list.pop();
    localStorage.setItem(STORAGE_KEYS.SYSTEM_LOGS, JSON.stringify(list));
    this.broadcastSync();
  }

  // --- TENANT ONBOARDING REQUESTS ---
  public getTenantRequests(): TenantRegistrationRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TENANT_REQUESTS);
      if (data) return JSON.parse(data);
    } catch {}

    const initial: TenantRegistrationRequest[] = [
      {
        id: 'req-seed-1',
        tenantCode: 'FUV-04',
        cinemaName: 'Fuvahmulah City Youth Theater',
        atoll: 'Gnaviyani (Gn)',
        island: 'Fuvahmulah City',
        contactPerson: 'Ibrahim Rasheed',
        contactPhone: '+960 791-5544',
        contactEmail: 'youth@fuvahmulah.gov.mv',
        subscriptionPlan: 'monthly',
        subscriptionPriceMvr: 249,
        paymentMethod: 'bml_transfer',
        channel: 'whatsapp',
        status: 'pending',
        notes: 'Requires 2 multi-screens in youth auditorium',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'req-seed-2',
        tenantCode: 'ADH-05',
        cinemaName: 'Mahibadhoo Community Screen',
        atoll: 'Alif Dhaal (ADh)',
        island: 'Mahibadhoo',
        contactPerson: 'Aishath Niuma',
        contactPhone: '+960 778-9900',
        contactEmail: 'cinema@mahibadhoo.org',
        subscriptionPlan: 'weekly',
        subscriptionPriceMvr: 149,
        paymentMethod: 'bml_gateway',
        channel: 'in_app',
        status: 'pending',
        notes: 'Weekend community premiere release screening',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(initial));
    return initial;
  }

  public createTenantRequest(req: Omit<TenantRegistrationRequest, 'id' | 'createdAt' | 'status' | 'tenantCode'> & { tenantCode?: string }): TenantRegistrationRequest {
    const list = this.getTenantRequests();
    const shortCode = req.tenantCode || `TEN-${req.island.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    const newReq: TenantRegistrationRequest = {
      ...req,
      id: `req-${Date.now()}`,
      tenantCode: shortCode,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    list.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(list));

    this.addLog({
      id: `log-${Date.now()}-req`,
      type: 'tenant',
      tenantId: 'platform',
      message: `New Tenant Registration Request: ${newReq.cinemaName} (${newReq.tenantCode})`,
      details: `Plan: ${newReq.subscriptionPlan} • Channel: ${newReq.channel.toUpperCase()} • Contact: ${newReq.contactPhone}`,
      status: 'info',
      timestamp: newReq.createdAt
    });

    this.broadcastSync();
    return newReq;
  }

  public approveTenantRequest(requestId: string): Tenant | null {
    const requests = this.getTenantRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return null;

    req.status = 'approved';
    localStorage.setItem(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(requests));

    const slug = req.cinemaName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `tenant-${Date.now()}`;
    const daysToAdd = req.subscriptionPlan === 'weekly' ? 7 : (req.subscriptionPlan === 'yearly' || req.subscriptionPlan === 'one_month') ? 365 : 30;
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: req.cinemaName,
      slug: slug,
      tenantCode: req.tenantCode,
      tier: 'paid',
      status: 'active',
      ownerEmail: req.contactEmail,
      subscriptionModel: req.subscriptionPlan,
      subscriptionPriceMvr: req.subscriptionPriceMvr,
      subscriptionBillingDate: new Date(Date.now() + daysToAdd * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      branding: {
        logoUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=200&h=200&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=600&fit=crop&q=80',
        primaryColor: '#0d9488',
        contactPhone: req.contactPhone,
        contactViber: req.contactPhone,
        island: req.island,
        atoll: req.atoll,
        terms: 'Tickets are non-refundable. Please arrive 15 minutes before showtime.',
        bankDetails: {
          bankName: 'Bank of Maldives (BML)',
          accountNumber: '7701 0000 0000 001',
          accountName: req.cinemaName,
          currency: 'MVR',
          instructions: 'Please transfer ticket amount and provide booking reference in memo.'
        }
      }
    };

    this.saveTenant(newTenant);

    // Also auto-create a default hall for this tenant
    const newHall: Hall = {
      id: `hall-${Date.now()}`,
      tenantId: newTenant.id,
      name: `${req.cinemaName} Main Auditorium`,
      island: req.island,
      atoll: req.atoll,
      address: `${req.island}, Republic of Maldives`,
      contactPhone: req.contactPhone
    };
    this.saveHall(newHall);

    // And a default screen
    const newScreen: Screen = {
      id: `screen-${Date.now()}`,
      hallId: newHall.id,
      tenantId: newTenant.id,
      screenName: 'Main Screen 1',
      screenNumber: 1,
      positionInHall: 'center',
      layout: {
        rows: 5,
        cols: 7,
        rowLabels: ['A', 'B', 'C', 'D', 'E'],
        seats: generateStandardMatrix(5, 7),
        screenPosition: 'top',
        stageName: `${req.cinemaName.toUpperCase()} MAIN STAGE`
      }
    };
    this.saveScreen(newScreen);

    this.addLog({
      id: `log-${Date.now()}-apprv`,
      type: 'tenant',
      tenantId: newTenant.id,
      message: `Organizer Approved & Activated: ${newTenant.name} (${newTenant.tenantCode})`,
      details: `Plan: ${newTenant.subscriptionModel} (MVR ${newTenant.subscriptionPriceMvr}) • Portal: /t/${newTenant.slug}`,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    this.broadcastSync();
    return newTenant;
  }

  public rejectTenantRequest(requestId: string): void {
    const requests = this.getTenantRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    req.status = 'rejected';
    localStorage.setItem(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(requests));
    this.broadcastSync();
  }

  public getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    let sid = sessionStorage.getItem('mv_tickets_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('mv_tickets_session_id', sid);
    }
    return sid;
  }
}

export const cinemaStore = new MaldivianCinemaStore();
