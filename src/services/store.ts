import { 
  Tenant, Hall, Screen, Movie, Showtime, Booking, SeatHold, SystemLog, SeatConfig, SeatType, TenantRegistrationRequest, PlatformBankDetails 
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';


const STORAGE_KEYS = {
  TENANTS: 'mv_cloud_tenants_v5',
  HALLS: 'mv_cloud_halls_v5',
  SCREENS: 'mv_cloud_screens_v5',
  MOVIES: 'mv_cloud_movies_v5',
  SHOWTIMES: 'mv_cloud_showtimes_v5',
  BOOKINGS: 'mv_cloud_bookings_v5',
  SEAT_HOLDS: 'mv_cloud_seat_holds_v5',
  SYSTEM_LOGS: 'mv_cloud_logs_v5',
  TENANT_REQUESTS: 'mv_cloud_tenant_requests_v5',
  PLATFORM_BANK_DETAILS: 'mv_cloud_platform_bank_details_v5',
};

const DEFAULT_PLATFORM_BANK_DETAILS: PlatformBankDetails = {
  bankName: 'Bank of Maldives (BML)',
  accountNumber: '7701 1928 4401 001',
  accountName: 'CinemaMV Platform Pvt Ltd',
  currency: 'MVR',
  instructions: 'Please transfer subscription fee and include your cinema code or name in the transaction memo.',
  qrImageUrl: '',
  contactPhone: '+960 7771234',
  contactWhatsapp: '+960 7771234',
  contactTelegram: '@TicketsMVAdmin',
  contactEmail: 'alippalhey@gmail.com'
};

// No default/demo data: all cinemas, shows and movies come from tenants (Supabase is the source of truth).
const INITIAL_TENANTS: Tenant[] = [];
const INITIAL_HALLS: Hall[] = [];
const INITIAL_SCREENS: Screen[] = [];
const INITIAL_MOVIES: Movie[] = [];
const INITIAL_SHOWTIMES: Showtime[] = [];
const INITIAL_BOOKINGS: Booking[] = [];
const INITIAL_LOGS: SystemLog[] = [];

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

// =================================================================
// CLOUD SYNC LAYER (Supabase = single source of truth for every visitor)
// -----------------------------------------------------------------
// Every tenant / hall / screen / movie / showtime / booking / onboarding
// request is stored as one row in the `cinema_records` table. localStorage is
// only a fast local cache that is ALWAYS overwritten by the cloud copy, and
// Supabase Realtime pushes every insert/update/delete to all open devices
// instantly. This is what makes a shared link like test1.cinemamv.online show
// the same, live data on every customer's phone.
// =================================================================
type RecordKind = 'tenant' | 'hall' | 'screen' | 'movie' | 'showtime' | 'booking' | 'tenant_request';

const KIND_BY_KEY: Record<string, RecordKind> = {
  [STORAGE_KEYS.TENANTS]: 'tenant',
  [STORAGE_KEYS.HALLS]: 'hall',
  [STORAGE_KEYS.SCREENS]: 'screen',
  [STORAGE_KEYS.MOVIES]: 'movie',
  [STORAGE_KEYS.SHOWTIMES]: 'showtime',
  [STORAGE_KEYS.BOOKINGS]: 'booking',
  [STORAGE_KEYS.TENANT_REQUESTS]: 'tenant_request',
};

const KEY_BY_KIND: Record<RecordKind, string> = {
  tenant: STORAGE_KEYS.TENANTS,
  hall: STORAGE_KEYS.HALLS,
  screen: STORAGE_KEYS.SCREENS,
  movie: STORAGE_KEYS.MOVIES,
  showtime: STORAGE_KEYS.SHOWTIMES,
  booking: STORAGE_KEYS.BOOKINGS,
  tenant_request: STORAGE_KEYS.TENANT_REQUESTS,
};

const RECORDS_TABLE = 'cinema_records';
const BOOKED_SEATS_TABLE = 'cinema_booked_seats';
const SEAT_HOLDS_TABLE = 'cinema_seat_holds';

// Old localStorage keys / cookies that contained demo data or stale bridged copies.
const LEGACY_LOCAL_KEYS = [
  'mv_tickets_tenants_v1', 'mv_tickets_tenants_v2', 'mv_tickets_tenants_v3',
  'mv_tickets_halls_v1', 'mv_tickets_halls_v2',
  'mv_tickets_screens_v1', 'mv_tickets_screens_v2',
  'mv_tickets_movies_v1', 'mv_tickets_movies_v2',
  'mv_tickets_showtimes_v1', 'mv_tickets_showtimes_v2',
  'mv_tickets_bookings_v1', 'mv_tickets_bookings_v2',
  'mv_tickets_seat_holds_v1', 'mv_tickets_seat_holds_v2',
  'mv_tickets_logs_v1', 'mv_tickets_logs_v2',
  'mv_tickets_tenant_requests_v1',
  'mv_cinemamv_tombstones_v1',
];
const LEGACY_COOKIES = [
  'mv_cinemamv_tenants_v1', 'mv_cinemamv_halls_v1', 'mv_cinemamv_screens_v1',
  'mv_cinemamv_showtimes_v1', 'mv_cinemamv_tombstones_v1',
];

function purgeLegacyClientCaches() {
  if (typeof window === 'undefined') return;
  try {
    LEGACY_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}
  try {
    const host = window.location.hostname;
    const domains = ['', host.includes('cinemamv.online') ? '; domain=.cinemamv.online' : ''];
    LEGACY_COOKIES.forEach((name) => {
      domains.forEach((d) => {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${d}`;
      });
    });
  } catch {}
}

// In-Memory & LocalStorage Sync Store
class MaldivianCinemaStore {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();
  private supabaseSyncing: Promise<void> | null = null;
  private lastFullSync = 0;
  private readyPromise: Promise<void>;
  private ready = false;
  private applyingRemote = false;
  private readonly cloud: boolean = !!isSupabaseConfigured();

  constructor() {
    purgeLegacyClientCaches();
    this.initDefaults();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('mv_cinema_realtime_bus_v3');
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC') {
          this.notifyListeners();
        }
      };
    }

    if (this.cloud && typeof window !== 'undefined') {
      this.readyPromise = this.syncFromSupabase();
      this.startRealtime();
      // Bandwidth optimization: Throttle tab focus/visibility re-pull to avoid egress spikes
      window.addEventListener('focus', () => {
        if (Date.now() - this.lastFullSync > 60000) this.syncFromSupabase();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - this.lastFullSync > 60000) {
          this.syncFromSupabase();
        }
      });
    } else {
      this.ready = true;
      this.readyPromise = Promise.resolve();
    }
  }

  /** True when the app is connected to the shared Supabase cloud database. */
  public isCloudEnabled(): boolean {
    return this.cloud;
  }

  /** True once the first cloud download has finished (always true in offline mode). */
  public isReady(): boolean {
    return this.ready;
  }

  /** Resolves once the first cloud download has finished. */
  public whenReady(): Promise<void> {
    return this.readyPromise;
  }

  // Deletions are now real cloud deletes, so tombstones are no longer required.
  private getDeletedTombstones(): { movies: string[]; showtimes: string[] } {
    return { movies: [], showtimes: [] };
  }

  private addDeletedTombstone(_type: 'movie' | 'showtime', _id: string) {
    /* no-op: cloud delete is authoritative */
  }

  private initDefaults() {
    if (typeof window === 'undefined') return;
    const ensure = (key: string, value: unknown[]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
    };
    ensure(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    ensure(STORAGE_KEYS.HALLS, INITIAL_HALLS);
    ensure(STORAGE_KEYS.SCREENS, INITIAL_SCREENS);
    ensure(STORAGE_KEYS.MOVIES, INITIAL_MOVIES);
    ensure(STORAGE_KEYS.SHOWTIMES, INITIAL_SHOWTIMES);
    ensure(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    ensure(STORAGE_KEYS.SEAT_HOLDS, []);
    ensure(STORAGE_KEYS.SYSTEM_LOGS, INITIAL_LOGS);
    ensure(STORAGE_KEYS.TENANT_REQUESTS, []);
  }

  /**
   * Writes a list to the local cache and, in cloud mode, pushes exactly the
   * rows that were added / changed / removed to Supabase.
   */
  private persist(key: string, json: string): void {
    const kind = KIND_BY_KEY[key];
    const shouldPush = !!kind && this.cloud && !this.applyingRemote;
    let prev: any[] = [];
    if (shouldPush) {
      try { prev = JSON.parse(localStorage.getItem(key) || '[]'); } catch { prev = []; }
    }
    localStorage.setItem(key, json);
    if (!shouldPush) return;

    let next: any[];
    try { next = JSON.parse(json); } catch { return; }
    if (!Array.isArray(next) || !Array.isArray(prev)) return;

    const prevMap = new Map<string, string>();
    prev.forEach((x) => { if (x && x.id) prevMap.set(x.id, JSON.stringify(x)); });
    const nextIds = new Set<string>();
    const upserts: any[] = [];
    const now = new Date().toISOString();
    next.forEach((item) => {
      if (!item || !item.id) return;
      nextIds.add(item.id);
      if (prevMap.get(item.id) !== JSON.stringify(item)) {
        upserts.push({
          kind,
          id: item.id,
          tenant_id: kind === 'tenant' ? item.id : (item.tenantId || null),
          data: item,
          updated_at: now,
        });
      }
    });
    const deletes = prev.filter((x) => x && x.id && !nextIds.has(x.id)).map((x) => x.id as string);

    if (upserts.length > 0) {
      supabase.from(RECORDS_TABLE).upsert(upserts, { onConflict: 'kind,id' }).then(({ error }) => {
        if (error) console.warn(`[cloud] upsert ${kind} failed:`, error.message);
      });
    }
    if (deletes.length > 0) {
      supabase.from(RECORDS_TABLE).delete().eq('kind', kind).in('id', deletes).then(({ error }) => {
        if (error) console.warn(`[cloud] delete ${kind} failed:`, error.message);
      });
      if (kind === 'booking') {
        supabase.from(BOOKED_SEATS_TABLE).delete().in('booking_id', deletes).then(() => {});
      }
    }
  }

  /**
   * Downloads public catalogue records from Supabase.
   * BANDWIDTH & PRIVACY OPTIMIZATIONS:
   * 1. Bookings are NEVER downloaded in public sync to protect customer privacy.
   * 2. When scoped to a tenant (e.g. portal or subdomain), only that tenant's records are fetched.
   */
  public syncFromSupabase(targetTenantId?: string): Promise<void> {
    if (!this.cloud) return Promise.resolve();
    if (this.supabaseSyncing) return this.supabaseSyncing;

    this.supabaseSyncing = (async () => {
      try {
        let query = supabase
          .from(RECORDS_TABLE)
          .select('kind,id,tenant_id,data')
          .neq('kind', 'booking') // PRIVACY: Never expose guest bookings in public sync
          .limit(1000);

        if (targetTenantId) {
          query = query.or(`kind.eq.tenant,tenant_id.eq.${targetTenantId},id.eq.${targetTenantId}`);
        }

        const { data: rows, error } = await query;
        if (error) throw error;

        const grouped: Record<RecordKind, any[]> = {
          tenant: [], hall: [], screen: [], movie: [], showtime: [], booking: [], tenant_request: [],
        };
        (rows || []).forEach((r) => {
          if (grouped[r.kind as RecordKind]) grouped[r.kind as RecordKind].push(r.data);
        });

        this.applyingRemote = true;
        try {
          (Object.keys(grouped) as RecordKind[]).forEach((kind) => {
            if (kind === 'booking') return; // Do not overwrite local bookings with empty public list
            const list = grouped[kind];
            if (targetTenantId && kind !== 'tenant') {
              // Merge tenant scoped items with existing cache
              const key = KEY_BY_KIND[kind];
              let existing: any[] = [];
              try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch { existing = []; }
              const other = existing.filter((x) => x.tenantId !== targetTenantId);
              localStorage.setItem(key, JSON.stringify([...other, ...list]));
            } else {
              localStorage.setItem(KEY_BY_KIND[kind], JSON.stringify(list));
            }
          });
        } finally {
          this.applyingRemote = false;
        }

        // Shared seat holds (10-minute locks)
        const { data: holds } = await supabase
          .from(SEAT_HOLDS_TABLE)
          .select('showtime_id,seat_id,session_id,expires_at')
          .gt('expires_at', new Date().toISOString());
        if (holds) {
          const mapped: SeatHold[] = holds.map((h: any) => ({
            showtimeId: h.showtime_id,
            seatId: h.seat_id,
            sessionId: h.session_id,
            expiresAt: new Date(h.expires_at).getTime(),
          }));
          localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(mapped));
        }
      } catch (e: any) {
        console.warn('[cloud] sync failed, showing last cached data:', e?.message || e);
      } finally {
        this.ready = true;
        this.lastFullSync = Date.now();
        this.supabaseSyncing = null;
        this.notifyListeners();
      }
    })();
    return this.supabaseSyncing;
  }

  /**
   * SECURE TENANT BOOKINGS SYNC:
   * Called strictly by logged-in organizers from TenantAdminPage to retrieve
   * only the attendee bookings belonging to their specific cinema.
   */
  public async syncBookingsForTenant(tenantId: string): Promise<Booking[]> {
    if (!tenantId) return [];
    if (this.cloud) {
      try {
        const { data: rows, error } = await supabase
          .from(RECORDS_TABLE)
          .select('data')
          .eq('kind', 'booking')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false });

        if (!error && rows) {
          const bookings = rows.map((r) => r.data as Booking);
          let allBookings = this.getBookings();
          // Replace bookings for this tenant with fresh cloud records
          allBookings = allBookings.filter((b) => b.tenantId !== tenantId);
          allBookings.unshift(...bookings);
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(allBookings));
          this.broadcastSync();
          return bookings;
        }
      } catch (e) {
        console.warn('[cloud] syncBookingsForTenant error:', e);
      }
    }
    return this.getBookings(tenantId);
  }

  /**
   * Single ticket pass lookup for a guest opening /ticket/:bookingRef.
   */
  public async fetchBookingByRef(bookingRef: string): Promise<Booking | undefined> {
    const cleanRef = bookingRef.trim().toUpperCase();
    const existing = this.getBookingByRef(cleanRef);
    if (existing) return existing;
    if (this.cloud) {
      try {
        const { data, error } = await supabase
          .from(RECORDS_TABLE)
          .select('data')
          .eq('kind', 'booking')
          .limit(50);
        if (!error && data) {
          const match = data.find((r: any) => r.data?.bookingRef?.toUpperCase() === cleanRef);
          if (match?.data) {
            const list = this.getBookings();
            list.unshift(match.data);
            localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
            return match.data;
          }
        }
      } catch {}
    }
    return undefined;
  }

  /** Subscribes to live database changes so every open device updates instantly. */
  private startRealtime() {
    supabase
      .channel('cinemamv-live-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: RECORDS_TABLE }, (payload: any) => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const kind = row?.kind as RecordKind | undefined;
        if (!kind || !KEY_BY_KIND[kind] || !row.id) return;
        const key = KEY_BY_KIND[kind];
        let list: any[] = [];
        try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch { list = []; }
        const idx = list.findIndex((x) => x && x.id === row.id);
        if (payload.eventType === 'DELETE') {
          if (idx >= 0) list.splice(idx, 1);
        } else if (row.data) {
          if (idx >= 0) list[idx] = row.data;
          else if (kind === 'booking' || kind === 'tenant_request') list.unshift(row.data);
          else list.push(row.data);
        }
        localStorage.setItem(key, JSON.stringify(list));
        this.broadcastSync();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: SEAT_HOLDS_TABLE }, (payload: any) => {
        let all: SeatHold[] = [];
        try { all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS) || '[]'); } catch { all = []; }
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (!row) return;
        all = all.filter((h) => !(h.showtimeId === row.showtime_id && h.seatId === row.seat_id));
        if (payload.eventType !== 'DELETE' && row.expires_at) {
          all.push({
            showtimeId: row.showtime_id,
            seatId: row.seat_id,
            sessionId: row.session_id,
            expiresAt: new Date(row.expires_at).getTime(),
          });
        }
        localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
        this.broadcastSync();
      })
      .subscribe((status: string) => {
        // After a reconnect, re-pull everything so nothing missed while offline is stale
        if (status === 'SUBSCRIBED' && this.ready) this.syncFromSupabase();
      });
  }

  /** Legacy iframe bridge import – ignored in cloud mode (cloud data is authoritative). */
  public importSyncPayload(_payload: any): boolean {
    return false;
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
        this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));
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
      this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));
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
      const data = localStorage.getItem(STORAGE_KEYS.TENANTS);
      const list: Tenant[] = data ? JSON.parse(data) : INITIAL_TENANTS;

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
        if (t.branding) {
          if (t.branding.taglineEn && /island cinema \(free trial\)|free trial/i.test(t.branding.taglineEn)) {
            t.branding.taglineEn = '';
            updated = true;
          }
          if (t.branding.taglineDv && /ޓްރަޔަލް/i.test(t.branding.taglineDv)) {
            t.branding.taglineDv = '';
            updated = true;
          }
          if (t.branding.terms && /3-day free trial account|free trial account/i.test(t.branding.terms)) {
            t.branding.terms = '';
            updated = true;
          }
        }
      });
      if (updated) {
        this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));
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
    this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));


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
      this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));


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
      this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));


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
    this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(updatedTenants));

    // Delete all linked halls, screens, showtimes, movies
    try {
      const halls = this.getHalls().filter((h) => h.tenantId !== tenantId);
      this.persist(STORAGE_KEYS.HALLS, JSON.stringify(halls));

      const screens = this.getScreens().filter((s) => s.tenantId !== tenantId);
      this.persist(STORAGE_KEYS.SCREENS, JSON.stringify(screens));

      const showtimes = this.getShowtimes().filter((st) => st.tenantId !== tenantId);
      this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(showtimes));

      const movies = this.getMovies().filter((m) => m.tenantId !== tenantId);
      this.persist(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
    } catch {}


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
    this.persist(STORAGE_KEYS.TENANTS, JSON.stringify(list));

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
      const data = localStorage.getItem(STORAGE_KEYS.HALLS);
      const list: Hall[] = data ? JSON.parse(data) : INITIAL_HALLS;
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
    this.persist(STORAGE_KEYS.HALLS, JSON.stringify(list));
    this.broadcastSync();
  }

  // --- SCREENS (MULTIPLE SCREENS PER HALL) ---
  public getScreens(hallId?: string): Screen[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCREENS);
      const list: Screen[] = data ? JSON.parse(data) : INITIAL_SCREENS;
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
    this.persist(STORAGE_KEYS.SCREENS, JSON.stringify(list));


    this.broadcastSync();
  }

  public deleteScreen(screenId: string): void {
    let list = this.getScreens();
    list = list.filter((s) => s.id !== screenId);
    this.persist(STORAGE_KEYS.SCREENS, JSON.stringify(list));

    // Also remove any showtimes linked to this deleted screen
    let showtimes = this.getShowtimes();
    showtimes = showtimes.filter((st) => st.screenId !== screenId);
    this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(showtimes));


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
    this.persist(STORAGE_KEYS.MOVIES, JSON.stringify(list));


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
    this.persist(STORAGE_KEYS.MOVIES, JSON.stringify(list));

    // Record tombstone so it never re-seeds in fresh browser sessions
    this.addDeletedTombstone('movie', movieId);

    // Clean up showtimes for this movie
    let showtimes = this.getShowtimes();
    showtimes = showtimes.filter((st) => st.movieId !== movieId);
    this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(showtimes));


    this.broadcastSync();
  }

  public toggleMoviePublish(movieId: string): boolean {
    const list = this.getMovies();
    const movie = list.find((m) => m.id === movieId);
    if (!movie) return false;
    movie.published = movie.published === false ? true : false;
    this.persist(STORAGE_KEYS.MOVIES, JSON.stringify(list));


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
      const data = localStorage.getItem(STORAGE_KEYS.SHOWTIMES);
      const list: Showtime[] = data ? JSON.parse(data) : INITIAL_SHOWTIMES;
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
    this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(list));


    this.broadcastSync();
  }

  public cancelShowtime(showtimeId: string): void {
    const list = this.getShowtimes();
    const target = list.find((s) => s.id === showtimeId);
    if (target) {
      target.status = 'cancelled';
      this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(list));


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
    this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(list));

    // Record tombstone so it never re-seeds in fresh browser sessions
    this.addDeletedTombstone('showtime', showtimeId);


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
  public getSeatHolds(showtimeId: string, screenId?: string): SeatHold[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      const all: SeatHold[] = data ? JSON.parse(data) : [];
      const now = Date.now();
      const active = all.filter((h) => h.expiresAt > now);
      if (active.length !== all.length) {
        localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(active));
      }
      return active.filter((h) => 
        h.showtimeId === showtimeId && 
        (!screenId || !h.screenId || h.screenId === screenId)
      );
    } catch {
      return [];
    }
  }

  public acquireSeatHold(showtimeId: string, seatId: string, sessionId: string, holdMinutes = 10, screenId?: string): boolean {
    const now = Date.now();
    const expiresAt = now + holdMinutes * 60 * 1000;

    const booked = this.getBookedSeatIds(showtimeId, screenId);
    if (booked.has(seatId)) {
      return false;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      let all: SeatHold[] = data ? JSON.parse(data) : [];
      all = all.filter((h) => h.expiresAt > now);

      const existingIndex = all.findIndex((h) => 
        h.showtimeId === showtimeId && 
        h.seatId === seatId && 
        (!screenId || !h.screenId || h.screenId === screenId)
      );
      if (existingIndex >= 0) {
        if (all[existingIndex].sessionId === sessionId) {
          all[existingIndex].expiresAt = expiresAt;
          localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
          this.pushSeatHold(showtimeId, seatId, sessionId, expiresAt, screenId);
          this.broadcastSync();
          return true;
        } else {
          return false;
        }
      }

      all.push({
        showtimeId,
        screenId,
        seatId,
        sessionId,
        expiresAt
      });
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
      this.pushSeatHold(showtimeId, seatId, sessionId, expiresAt, screenId);
      this.broadcastSync();
      return true;
    } catch {
      return false;
    }
  }

  private pushSeatHold(showtimeId: string, seatId: string, sessionId: string, expiresAt: number, screenId?: string) {
    if (!this.cloud) return;
    const key = screenId ? `${screenId}_${seatId}` : seatId;
    supabase.from(SEAT_HOLDS_TABLE).upsert({
      showtime_id: showtimeId,
      seat_id: key,
      session_id: sessionId,
      expires_at: new Date(expiresAt).toISOString()
    }, { onConflict: 'showtime_id,seat_id' }).then(({ error }) => {
      if (error) console.warn('[cloud] seat hold failed:', error.message);
    });
  }

  public releaseSeatHold(showtimeId: string, seatId: string, sessionId: string, screenId?: string): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      let all: SeatHold[] = data ? JSON.parse(data) : [];
      all = all.filter((h) => !(
        h.showtimeId === showtimeId && 
        h.seatId === seatId && 
        h.sessionId === sessionId &&
        (!screenId || !h.screenId || h.screenId === screenId)
      ));
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
      if (this.cloud) {
        const key = screenId ? `${screenId}_${seatId}` : seatId;
        supabase.from(SEAT_HOLDS_TABLE).delete()
          .eq('showtime_id', showtimeId).eq('seat_id', key).eq('session_id', sessionId)
          .then(() => {});
      }
      this.broadcastSync();
    } catch {}
  }

  public releaseAllSessionHolds(showtimeId: string, sessionId: string): void {
    try {
      const baseSt = this.getShowtimeById(showtimeId);
      const relevantShowtimeIds = new Set<string>([showtimeId]);
      if (baseSt) {
        const siblings = this.getShowtimes(baseSt.tenantId).filter(
          (st) => st.hallId === baseSt.hallId && 
                  st.date === baseSt.date && 
                  st.startTime === baseSt.startTime && 
                  st.movieId === baseSt.movieId
        );
        siblings.forEach((st) => relevantShowtimeIds.add(st.id));
      }

      const data = localStorage.getItem(STORAGE_KEYS.SEAT_HOLDS);
      let all: SeatHold[] = data ? JSON.parse(data) : [];
      all = all.filter((h) => !(relevantShowtimeIds.has(h.showtimeId) && h.sessionId === sessionId));
      localStorage.setItem(STORAGE_KEYS.SEAT_HOLDS, JSON.stringify(all));
      if (this.cloud) {
        relevantShowtimeIds.forEach((sid) => {
          supabase.from(SEAT_HOLDS_TABLE).delete()
            .eq('showtime_id', sid).eq('session_id', sessionId)
            .then(() => {});
        });
      }
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

  public getBookedSeatIds(showtimeId: string, screenId?: string): Set<string> {
    const baseSt = this.getShowtimeById(showtimeId);
    const relevantShowtimeIds = new Set<string>([showtimeId]);
    if (baseSt) {
      const siblings = this.getShowtimes(baseSt.tenantId).filter(
        (st) => st.hallId === baseSt.hallId && 
                st.date === baseSt.date && 
                st.startTime === baseSt.startTime && 
                st.movieId === baseSt.movieId
      );
      siblings.forEach((st) => relevantShowtimeIds.add(st.id));
    }

    const list = this.getBookings().filter((b) => relevantShowtimeIds.has(b.showtimeId) && b.paymentStatus !== 'expired');
    const set = new Set<string>();
    list.forEach((b) => {
      b.seats.forEach((s) => {
        if (!screenId || !s.screenId || s.screenId === screenId) {
          set.add(s.seatId);
        }
      });
    });
    return set;
  }

  public getOrCreateShowtimeForScreen(screenId: string, baseShowtime: Showtime): Showtime {
    const list = this.getShowtimes();
    const existing = list.find((st) => 
      st.screenId === screenId && 
      st.date === baseShowtime.date && 
      st.movieId === baseShowtime.movieId
    );
    if (existing) return existing;

    const targetScreen = this.getScreenById(screenId);
    const newShow: Showtime = {
      id: `show-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      movieId: baseShowtime.movieId,
      screenId: screenId,
      hallId: targetScreen ? targetScreen.hallId : baseShowtime.hallId,
      tenantId: baseShowtime.tenantId,
      date: baseShowtime.date,
      startTime: baseShowtime.startTime,
      endTime: baseShowtime.endTime,
      priceTiers: { ...baseShowtime.priceTiers },
      status: baseShowtime.status
    };

    list.push(newShow);
    this.persist(STORAGE_KEYS.SHOWTIMES, JSON.stringify(list));
    this.broadcastSync();
    return newShow;
  }

  /**
   * Cloud-safe booking: atomically reserves the seats in Supabase first (unique
   * showtime+seat constraint), so two customers on different phones can never
   * buy the same seat. Falls back to the local check when offline.
   */
  public async createBookingAsync(booking: Booking, sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (this.cloud) {
      // Make sure we validate against the latest cloud state
      await this.syncFromSupabase();
      const seatRows = booking.seats.map((s) => ({
        showtime_id: booking.showtimeId,
        seat_id: s.screenId ? `${s.screenId}_${s.seatId}` : s.seatId,
        booking_id: booking.id,
        tenant_id: booking.tenantId
      }));
      const { error } = await supabase.from(BOOKED_SEATS_TABLE).insert(seatRows);
      if (error) {
        const conflict = error.code === '23505' || /duplicate|unique/i.test(error.message);
        return {
          success: false,
          error: conflict
            ? 'One or more of your seats was just booked by another guest. Please pick different seats.'
            : `Could not reach the booking server (${error.message}). Please try again.`
        };
      }
    }
    const result = this.createBooking(booking, sessionId);
    if (!result.success && this.cloud) {
      supabase.from(BOOKED_SEATS_TABLE).delete().eq('booking_id', booking.id).then(() => {});
    }
    return result;
  }

  public createBooking(booking: Booking, sessionId: string): { success: boolean; error?: string } {
    for (const seat of booking.seats) {
      const bookedOnScreen = this.getBookedSeatIds(booking.showtimeId, seat.screenId);
      if (bookedOnScreen.has(seat.seatId)) {
        return { success: false, error: `Seat ${seat.label} has already been reserved or booked by another guest.` };
      }
    }

    const list = this.getBookings();
    list.unshift(booking);
    this.persist(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));

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
      this.persist(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
      if (status === 'expired' && this.cloud) {
        // Free the seats in the cloud so other customers can book them
        supabase.from(BOOKED_SEATS_TABLE).delete().eq('booking_id', bookingId).then(() => {});
      }
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

  public validateTicket(qrCodeOrRef: string, tenantId?: string): { 
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

    if (tenantId && booking.tenantId !== tenantId) {
      const otherTenant = this.getTenants().find((t) => t.id === booking.tenantId);
      return {
        valid: false,
        alreadyCheckedIn: false,
        booking,
        message: `Wrong Cinema! This ticket is for "${otherTenant?.name || 'another cinema'}", not for this venue.`
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
    this.persist(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));

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

  // --- PLATFORM BANK DETAILS (Super Admin Managed) ---
  public getPlatformBankDetails(): PlatformBankDetails {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLATFORM_BANK_DETAILS);
      if (data) return JSON.parse(data);
    } catch {}
    return { ...DEFAULT_PLATFORM_BANK_DETAILS };
  }

  public savePlatformBankDetails(details: PlatformBankDetails): void {
    this.persist(STORAGE_KEYS.PLATFORM_BANK_DETAILS, JSON.stringify(details));
    this.addLog({
      id: `log-${Date.now()}-platform-bank`,
      type: 'tenant',
      tenantId: 'platform',
      message: `Super Admin updated CinemaMV Platform Bank Details (${details.bankName} - ${details.accountNumber})`,
      status: 'info',
      timestamp: new Date().toISOString()
    });
    this.broadcastSync();
  }

  // --- TENANT ONBOARDING REQUESTS ---
  public getTenantRequests(): TenantRegistrationRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TENANT_REQUESTS);
      if (data) return JSON.parse(data);
    } catch {}

    return [];
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
    this.persist(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(list));

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
    this.persist(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(requests));

    // If an existing tenant is upgrading / switching their subscription plan
    const existingTenant = this.getTenants().find(
      (t) => (req.tenantCode && t.tenantCode?.toLowerCase() === req.tenantCode.toLowerCase()) ||
             t.ownerEmail.toLowerCase() === req.contactEmail.toLowerCase()
    );
    if (existingTenant) {
      this.updateTenantSubscription(existingTenant.id, req.subscriptionPlan, req.subscriptionPriceMvr);
      this.addLog({
        id: `log-${Date.now()}-approved-upgrade`,
        type: 'tenant',
        tenantId: existingTenant.id,
        message: `Tenant "${existingTenant.name}" (${existingTenant.tenantCode}) plan upgrade to ${req.subscriptionPlan.toUpperCase()} approved by Super Admin`,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      this.broadcastSync();
      return existingTenant;
    }

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
      passwordHash: req.passwordHash || 'password123',
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
    this.persist(STORAGE_KEYS.TENANT_REQUESTS, JSON.stringify(requests));
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
