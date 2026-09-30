import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cinemaStore } from '../services/store';
import { Showtime, Screen, Movie, Hall, Tenant, BookedSeat } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { SeatMap } from '../components/SeatMap';
import { 
  Film, MapPin, Calendar, Clock, ArrowLeft, ShieldCheck, 
  ChevronRight, Ticket, Sparkles, LayoutGrid, Eye, AlertCircle, Ban 
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, isDhivehi } = useLanguage();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [hall, setHall] = useState<Hall | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [hallScreens, setHallScreens] = useState<Screen[]>([]);
  const [hallShowtimes, setHallShowtimes] = useState<Showtime[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);

  // Layout view mode: 'shared_hall' shows all screens in the shared room on one page!
  const [viewMode, setViewMode] = useState<'shared_hall' | 'focused'>('shared_hall');
  const [selectedSeats, setSelectedSeats] = useState<BookedSeat[]>([]);

  useEffect(() => {
    if (!showtimeId) return;
    const st = cinemaStore.getShowtimeById(showtimeId);
    if (st) {
      setShowtime(st);
      const sc = cinemaStore.getScreenById(st.screenId);
      if (sc) setScreen(sc);
      const mv = cinemaStore.getMovieById(st.movieId);
      if (mv) setMovie(mv);
      const hl = cinemaStore.getHalls().find((h) => h.id === st.hallId);
      if (hl) {
        setHall(hl);
        // Get all screens in this hall
        const screensInHall = cinemaStore.getScreens(hl.id);
        setHallScreens(screensInHall);
      }
      const tn = cinemaStore.getTenantById(st.tenantId);
      if (tn) setTenant(tn);

      setHallShowtimes(cinemaStore.getShowtimes(st.tenantId));
      setAllMovies(cinemaStore.getMovies());
    }
  }, [showtimeId]);

  if (!showtime || !screen || !movie) {
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

  // Switch screens to book seats seamlessly
  const handleSwitchToScreen = (targetScreen: Screen) => {
    if (targetScreen.id === screen.id) return;
    setSelectedSeats([]);

    const otherShow = hallShowtimes.find(
      (st) => st.screenId === targetScreen.id && st.date === showtime.date
    );

    if (otherShow) {
      navigate(`/book/${otherShow.id}`);
    } else {
      setScreen(targetScreen);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
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
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
              <span>{movie.titleEn}</span>
              <span className="font-dhivehi text-teal-400 text-base font-normal">({movie.titleDv})</span>
            </h1>
          </div>
        </div>

        {/* Screening Meta pill & Hall Multi-Screen Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-3 text-xs bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-xl">
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
            <span className="text-teal-400 font-semibold">{screen.screenName}</span>
          </div>

          {/* View Mode Toggle when hall has multiple screens */}
          {hallScreens.length > 1 && (
            <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setViewMode('shared_hall')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'shared_hall'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View all screens in this shared hall room on one page"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Shared Hall Room ({hallScreens.length} Screens)</span>
              </button>
              <button
                onClick={() => setViewMode('focused')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'focused'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Focused Screen</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Screen Switcher Bar for Multi-Screen Hall */}
      {hallScreens.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-300 mr-2 flex items-center space-x-1.5">
            <LayoutGrid className="w-4 h-4 text-teal-400" />
            <span>Switch Screen to Book:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {sortedHallScreens.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSwitchToScreen(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm active:scale-95 ${
                  s.id === screen.id
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 ring-2 ring-teal-400'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                <span>{s.screenName}</span>
                {s.id === screen.id ? (
                  <span className="text-[10px] font-extrabold uppercase px-1 rounded bg-slate-950/20 text-slate-950">Active</span>
                ) : (
                  <span className="text-[10px] text-teal-400">→</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Shared Hall Multi-Screen Architectural Banner */}
      {hallScreens.length > 1 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <LayoutGrid className="w-4 h-4 text-teal-400" />
                <span>{hall?.name} • Shared Hall Architectural Layout</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                This large hall contains {hallScreens.length} screens in a single shared room. Tap any screen card below to switch and book seats.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 self-start sm:self-auto">
              Shared Room Layout
            </span>
          </div>

          {/* Quick Jump / Position Indicator between screens in this shared hall */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {sortedHallScreens.map((s) => {
              const isSelectedScreen = s.id === screen.id;
              // Find showtime for this screen
              const otherShow = hallShowtimes.find((st) => st.screenId === s.id && st.date === showtime.date);
              const otherMovie = otherShow ? allMovies.find((m) => m.id === otherShow.movieId) : null;

              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => handleSwitchToScreen(s)}
                  className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between space-y-2 cursor-pointer active:scale-95 ${
                    isSelectedScreen
                      ? 'bg-teal-950/40 border-teal-500/60 ring-2 ring-teal-500/20 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                      <span>{s.screenName}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300">
                      {s.positionInHall || 'Wing'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate w-full">
                    {otherMovie ? `Playing: ${otherMovie.titleEn}` : 'Screening in shared hall'}
                  </p>

                  <div className="flex items-center justify-between pt-1 w-full">
                    <span className="text-[10px] text-slate-500">
                      {s.layout.rows} Rows • {s.layout.cols} Cols
                    </span>
                    {isSelectedScreen ? (
                      <span className="text-[10px] font-bold text-teal-400 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Active Booking</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-teal-400 hover:underline">
                        Switch to Screen →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SHARED HALL FULL ROOM VIEW (ALL SCREENS ON ONE PAGE) */}
      {viewMode === 'shared_hall' && hallScreens.length > 1 ? (
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-teal-400">
              Shared Auditorium Overview: All {hallScreens.length} Screens Side-by-Side
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select seats on your active screen below ({screen.screenName}) while seeing the other screens in the room.
            </p>
          </div>

          {/* Side-by-side or stacked grid representing the shared hall room */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {sortedHallScreens.map((s) => {
              const isSelectedScreen = s.id === screen.id;

              return (
                <div
                  key={s.id}
                  onClick={() => !isSelectedScreen && handleSwitchToScreen(s)}
                  className={`rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                    isSelectedScreen
                      ? 'glass-panel-glow border-teal-500/50 shadow-2xl ring-2 ring-teal-500/20'
                      : 'glass-panel border-slate-800 opacity-80 hover:opacity-100 hover:border-teal-500/50 cursor-pointer'
                  }`}
                >
                  <div className="mb-4 pb-3 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        {s.positionInHall?.toUpperCase() || 'WING'} SECTION
                      </span>
                      <h4 className="font-bold text-sm text-white">{s.screenName}</h4>
                    </div>
                    {isSelectedScreen ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        Book Here
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-teal-400 hover:underline">
                        Tap to Switch →
                      </span>
                    )}
                  </div>

                  {/* Render interactive SeatMap if active, or preview grid if other screen */}
                  {isSelectedScreen ? (
                    <SeatMap
                      screen={s}
                      showtime={showtime}
                      onSeatSelectionChange={(seats) => setSelectedSeats(seats)}
                      onHoldExpired={() => {
                        alert('Your 10-minute seat hold has expired. Please reselect your preferred seats.');
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Cinema Curved Screen representation */}
                      <div className="text-center">
                        <div className="cinema-screen-curve mx-auto max-w-xs mb-1.5 opacity-60" />
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {s.layout.stageName || s.screenName}
                        </span>
                      </div>

                      {/* Mini visual seat matrix preview */}
                      <div className="overflow-x-auto pb-2 flex flex-col items-center space-y-1">
                        {s.layout.rowLabels.map((rowLabel) => {
                          const seatsInRow = s.layout.seats.filter((seat) => seat.row === rowLabel);
                          return (
                            <div key={rowLabel} className="flex items-center space-x-1">
                              <span className="w-3 text-[9px] font-bold text-slate-600">{rowLabel}</span>
                              <div className="flex items-center space-x-1">
                                {seatsInRow.map((seat) => (
                                  <div
                                    key={seat.id}
                                    className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-mono ${
                                      seat.type === 'vip'
                                        ? 'bg-amber-950/40 text-amber-500 border border-amber-600/30'
                                        : seat.type === 'couple'
                                        ? 'bg-rose-950/40 text-rose-500 border border-rose-600/30'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                    }`}
                                  >
                                    {seat.col}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchToScreen(s);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 active:scale-95"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Switch to {s.screenName} to Book Seats →</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* FOCUSED SCREEN VIEW */
        <div className="glass-panel rounded-3xl p-4 sm:p-8 border border-slate-800 shadow-2xl relative">
          <SeatMap
            screen={screen}
            showtime={showtime}
            onSeatSelectionChange={(seats) => setSelectedSeats(seats)}
            onHoldExpired={() => {
              alert('Your 10-minute seat hold has expired. Please reselect your preferred seats.');
            }}
          />
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-40">
        <div className="glass-panel-glow max-w-4xl mx-auto rounded-2xl p-4 border border-teal-500/30 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl bg-[#0a0f1d]/95">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 hidden sm:block">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold text-slate-400">
                  Selected Seats ({screen.screenName}):
                </span>
                <span className="text-sm font-mono font-bold text-teal-300">
                  {selectedSeats.length > 0
                    ? selectedSeats.map((s) => s.label).join(', ')
                    : 'None yet'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedSeats.length} seat(s) reserved with 10-min live hold
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
