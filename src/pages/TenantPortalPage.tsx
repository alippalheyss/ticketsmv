import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cinemaStore } from '../services/store';
import { Tenant, Hall, Screen, Movie, Showtime } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  Building2, MapPin, Phone, MessageSquare, Calendar, Clock, 
  Film, Sparkles, ChevronRight, ShieldCheck, AlertCircle 
} from 'lucide-react';

interface TenantPortalProps {
  tenantSlugFromHost?: string;
}

export const TenantPortalPage: React.FC<TenantPortalProps> = ({ tenantSlugFromHost }) => {
  const { tenantSlug: paramSlug } = useParams<{ tenantSlug: string }>();
  const tenantSlug = tenantSlugFromHost || paramSlug;
  const { t, formatCurrency, isDhivehi } = useLanguage();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantSlug) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Reads the (cloud-synced) store and pushes it into component state.
    const refresh = () => {
      if (cancelled) return;
      const found = cinemaStore.getTenantBySlug(tenantSlug);
      if (found) {
        setTenant(found);
        setHalls(cinemaStore.getHalls(found.id));
        setScreens(cinemaStore.getScreens().filter((s) => s.tenantId === found.id));
        setMovies(cinemaStore.getMovies(found.id).filter((m) => m.published !== false));
        setShowtimes(cinemaStore.getShowtimes(found.id));
      } else {
        setTenant(null);
        setHalls([]);
        setScreens([]);
        setMovies([]);
        setShowtimes([]);
      }
      // Only stop the spinner once the first live cloud download has completed,
      // so visitors never see stale cached shows or a false "not found".
      if (cinemaStore.isReady()) setLoading(false);
    };

    refresh();
    cinemaStore.whenReady().then(refresh);
    // Every realtime insert/update/delete from Supabase triggers this.
    const unsub = cinemaStore.subscribe(refresh);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    const isSubdomainHost = typeof window !== 'undefined' && 
      (window.location.hostname.includes('.cinemamv.online') || 
       (window.location.hostname.endsWith('.localhost') && window.location.hostname !== 'localhost'));
    const mainDirectoryUrl = isSubdomainHost ? 'https://cinemamv.online' : '/';

    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-xl">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Cinema Portal Not Found</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The cinema subdomain <span className="font-mono text-amber-300 font-bold">"{tenantSlug}.cinemamv.online"</span> is not registered on CinemaMV.online.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          {isSubdomainHost && (
            <a
              href={`https://cinemamv.online/t/${tenantSlug}`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs border border-teal-500/30 transition"
            >
              Try Universal Link (/t/{tenantSlug}) ↗
            </a>
          )}
          <a
            href={mainDirectoryUrl}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition shadow-md shadow-teal-500/20"
          >
            Return to CinemaMV.online Directory
          </a>
        </div>
      </div>
    );
  }

  if (tenant.status === 'suspended') {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4 space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
            Portal Suspended
          </span>
          <h2 className="text-2xl font-extrabold text-white">Cinema Bookings Offline</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            Ticket sales and online seat reservations for <strong className="text-white">{tenant.name}</strong> are temporarily suspended by platform administration.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
          <p>Are you the cinema organizer?</p>
          <p>Contact Super Admin at <span className="text-teal-400 font-mono font-bold">alippalhey@gmail.com</span> to reactivate your portal.</p>
        </div>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition active:scale-95"
          >
            ← Explore Other Active Cinemas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Branded Cinema Banner Header */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-800">
        <div className="absolute inset-0 h-72 sm:h-96 w-full overflow-hidden opacity-30">
          <img
            src={tenant.branding.bannerUrl}
            alt={tenant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/70 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 sm:pt-32">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-center space-x-4">
              <img
                src={tenant.branding.logoUrl}
                alt={tenant.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-teal-500/40 shadow-2xl bg-slate-900"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    {tenant.branding.atoll}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>{tenant.branding.island}</span>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
                  {tenant.name}
                </h1>
                <p className={`text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl ${isDhivehi ? 'font-dhivehi' : ''}`}>
                  {isDhivehi && tenant.branding.taglineDv ? tenant.branding.taglineDv : tenant.branding.taglineEn}
                </p>
              </div>
            </div>

            {/* Contact Phone & Viber */}
            <div className="flex flex-wrap items-center gap-3">
              {tenant.branding.contactPhone && (
                <a
                  href={`tel:${tenant.branding.contactPhone}`}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{tenant.branding.contactPhone}</span>
                </a>
              )}
              {tenant.branding.contactViber && (
                <a
                  href={`viber://chat?number=${tenant.branding.contactViber.replace(/\D/g, '')}`}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 text-xs font-semibold border border-purple-500/30 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Viber: {tenant.branding.contactViber}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Showtimes & Screens */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Film className="w-5 h-5 text-teal-400" />
            <span>Currently Screening at {tenant.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a showtime to choose seats and reserve tickets instantly.
          </p>
        </div>

        {/* Screening Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showtimes.map((st) => {
            const movie = movies.find((m) => m.id === st.movieId);
            const screen = screens.find((s) => s.id === st.screenId);
            const hall = halls.find((h) => h.id === st.hallId);
            const bookedCount = cinemaStore.getBookedSeatIds(st.id).size;
            const totalCapacity = screen ? screen.layout.seats.filter(s => s.active && s.type !== 'aisle').length : 50;
            const availableSeats = Math.max(0, totalCapacity - bookedCount);

            return (
              <div
                key={st.id}
                className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-teal-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                    <img
                      src={movie?.backdropUrl || movie?.posterUrl}
                      alt={movie?.titleEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-transparent to-black/30" />
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                      {movie?.ageRating}
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-base text-white">{movie?.titleEn}</h3>
                      <h4 className="font-dhivehi text-xs text-teal-400">{movie?.titleDv}</h4>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date & Slot:</span>
                        <span className="font-mono font-bold text-teal-300">{st.date} @ {st.startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Screen:</span>
                        <span className="text-slate-200 font-semibold">{screen?.screenName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hall:</span>
                        <span className="text-slate-200">{hall?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Available:</span>
                        <span className="font-bold text-emerald-400">{availableSeats} seats left</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    to={`/book/${st.id}`}
                    className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition"
                  >
                    <span>Pick Seats & Reserve (From {formatCurrency(st.priceTiers.standard)})</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}

          {showtimes.length === 0 && (
            <div className="col-span-full p-12 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No movie screenings currently scheduled for this cinema. Check back soon!
            </div>
          )}
        </div>

        {/* Custom Cinema Booking Terms */}
        {tenant.branding.terms && (
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Cinema Guidelines & Booking Terms</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {tenant.branding.terms}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
