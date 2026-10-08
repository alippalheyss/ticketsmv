import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cinemaStore } from '../services/store';
import { Showtime, Screen, Movie, Hall, Tenant, BookedSeat } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { SeatMap } from '../components/SeatMap';
import { 
  Film, Calendar, Clock, ArrowLeft, 
  ChevronRight, Ticket, LayoutGrid, AlertCircle, Ban, Check 
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, isDhivehi } = useLanguage();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [activeScreenId, setActiveScreenId] = useState<string>('');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [hall, setHall] = useState<Hall | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [hallScreens, setHallScreens] = useState<Screen[]>([]);
  const [hallShowtimes, setHallShowtimes] = useState<Showtime[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<BookedSeat[]>([]);

  useEffect(() => {
    if (!showtimeId) return;
    const st = cinemaStore.getShowtimeById(showtimeId);
    if (st) {
      setShowtime(st);
      setActiveScreenId(st.screenId);
      const mv = cinemaStore.getMovieById(st.movieId);
      if (mv) setMovie(mv);
      const hl = cinemaStore.getHalls().find((h) => h.id === st.hallId);
      if (hl) {
        setHall(hl);
        const screensInHall = cinemaStore.getScreens(hl.id);
        setHallScreens(screensInHall);
      }
      const tn = cinemaStore.getTenantById(st.tenantId);
      if (tn) setTenant(tn);

      setHallShowtimes(cinemaStore.getShowtimes(st.tenantId));
    }
  }, [showtimeId]);

  if (!showtime || !movie) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Showtime Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">
          This screening is no longer available or was rescheduled.
        </p>
        <Link to="/" className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs">
          Return to Showtimes
        </Link>
      </div>
    );
  }

  if (tenant?.status === 'suspended') {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Cinema Currently Suspended</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Online ticket bookings for <strong className="text-white">{tenant.name}</strong> are temporarily suspended by the platform administration.
        </p>
        <Link to="/" className="inline-block px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs">
          Return to All Cinemas
        </Link>
      </div>
    );
  }

  // Active Screen computation
  const activeScreen = hallScreens.find((s) => s.id === activeScreenId) || 
    hallScreens.find((s) => s.id === showtime.screenId) || 
    null;

  // Active Showtime for the selected screen in this hall session
  const activeShowtime = activeScreen
    ? (hallShowtimes.find(
        (st) => st.screenId === activeScreen.id && 
                st.date === showtime.date && 
                st.startTime === showtime.startTime &&
                st.movieId === showtime.movieId
      ) || showtime)
    : showtime;

  const isCancelled = showtime.status === 'cancelled';
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0 || isCancelled) return;
    sessionStorage.setItem(
      `mv_checkout_seats_${showtime.id}`,
      JSON.stringify(selectedSeats)
    );
    navigate(`/checkout/${showtime.id}`);
  };

  // Sort screens according to room position (left -> center -> right)
  const sortedHallScreens = [...hallScreens].sort((a, b) => {
    const order: Record<string, number> = { left: 1, front: 2, center: 3, right: 4, balcony: 5 };
    const posA = a.positionInHall ? order[a.positionInHall] || 3 : 3;
    const posB = b.positionInHall ? order[b.positionInHall] || 3 : 3;
    return posA - posB;
  });

  const isMultiScreenHall = hallScreens.length > 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back button & Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                {tenant?.name}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">{hall?.name}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center space-x-2">
              <span>{movie.titleEn}</span>
              <span className="font-dhivehi text-teal-400 text-sm sm:text-base font-normal">({movie.titleDv})</span>
            </h1>
          </div>
        </div>

        {/* Screening Meta Pill */}
        <div className="flex items-center space-x-3 text-xs bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl self-start lg:self-auto">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-medium">{showtime.date}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-white">{showtime.startTime}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-teal-400 font-semibold">
            {isMultiScreenHall 
              ? `Shared Hall (${hallScreens.length} Screens)` 
              : activeScreen?.screenName || 'Main Screen'}
          </span>
        </div>
      </div>

      {/* Cancelled Showtime Warning */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center space-x-3">
          <Ban className="w-6 h-6 text-rose-400 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm">Screening Cancelled</h3>
            <p className="text-xs text-rose-200/80">
              This showtime has been cancelled by the cinema organizer. Ticket bookings are temporarily suspended.
            </p>
          </div>
        </div>
      )}

      {/* Sleek, Single-Level Screen Switcher Bar for Multi-Screen Hall */}
      {isMultiScreenHall && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <LayoutGrid className="w-4 h-4 text-teal-400" />
              <span>Switch Screen to Select Seats ({hallScreens.length} Screens):</span>
            </span>
            <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/60 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
              {selectedSeats.length} / 8 seats selected
            </span>
          </div>

          {/* Compact Screen Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sortedHallScreens.map((s) => {
              const isActive = s.id === activeScreen?.id;
              const screenSeats = selectedSeats.filter((seat) => seat.screenId === s.id);

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveScreenId(s.id)}
                  className={`p-2.5 sm:p-3 rounded-xl text-left transition flex items-center justify-between border cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-teal-500/15 border-teal-500 ring-2 ring-teal-500/30 text-white shadow-lg'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs sm:text-sm font-bold truncate text-white">{s.screenName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      {s.positionInHall ? `${s.positionInHall} section` : 'Section'}
                    </span>
                  </div>

                  {screenSeats.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500 text-slate-950 flex-shrink-0 shadow-md">
                      {screenSeats.length} {screenSeats.length === 1 ? 'seat' : 'seats'}
                    </span>
                  ) : isActive ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-teal-400 border border-teal-500/30 flex-shrink-0">
                      Viewing
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      →
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400">
            💡 You can pick seats from different screens at the same time (up to 8 seats total in this hall). Tap a screen above to view and add its seats.
          </p>
        </div>
      )}

      {/* Interactive SeatMap */}
      {activeScreen ? (
        <div className="glass-panel rounded-3xl p-3 sm:p-6 border border-slate-800 shadow-2xl relative">
          <div className="mb-4 pb-3 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                {activeScreen.positionInHall?.toUpperCase() || 'MAIN'} SECTION
              </span>
              <h3 className="font-bold text-base text-white">{activeScreen.screenName}</h3>
            </div>
            {isMultiScreenHall && (
              <span className="text-xs text-slate-400">
                {selectedSeats.filter((s) => s.screenId === activeScreen.id).length} seat(s) selected on this screen
              </span>
            )}
          </div>

          <SeatMap
            key={activeScreen.id}
            screen={activeScreen}
            showtime={activeShowtime}
            initialSelectedSeatIds={selectedSeats.filter((s) => s.screenId === activeScreen.id).map((s) => s.seatId)}
            totalHallSelectedCount={selectedSeats.length}
            hallMaxSelectable={8}
            onSeatSelectionChange={(currentScreenSeats) => {
              setSelectedSeats((prev) => [
                ...prev.filter((s) => s.screenId !== activeScreen.id),
                ...currentScreenSeats,
              ]);
            }}
            onHoldExpired={() => {
              alert('Your 10-minute seat hold has expired. Please reselect your preferred seats.');
            }}
          />
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm glass-panel rounded-2xl">
          Screen not found in this hall.
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-40">
        <div className="glass-panel-glow max-w-4xl mx-auto rounded-2xl p-4 border border-teal-500/30 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl bg-[#0a0f1d]/95">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 hidden sm:block">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs uppercase font-bold text-slate-400">
                  Selected Seats ({selectedSeats.length}/8):
                </span>
                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {sortedHallScreens
                      .filter((scr) => selectedSeats.some((s) => s.screenId === scr.id))
                      .map((scr) => {
                        const scrSeats = selectedSeats.filter((s) => s.screenId === scr.id);
                        return (
                          <span
                            key={scr.id}
                            className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30"
                          >
                            {scr.screenName}: {scrSeats.map((s) => s.label).join(', ')}
                          </span>
                        );
                      })}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">None picked yet</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedSeats.length} seat(s) held across hall • 10-min live hold
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-4">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payable</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {formatCurrency(totalPrice)}
              </span>
            </div>

            <button
              onClick={handleProceedToCheckout}
              disabled={selectedSeats.length === 0 || isCancelled}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition active:scale-95 ${
                selectedSeats.length > 0 && !isCancelled
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-teal-500/25'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
              }`}
            >
              <span>{isCancelled ? 'Show Cancelled' : t('checkout.title')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
