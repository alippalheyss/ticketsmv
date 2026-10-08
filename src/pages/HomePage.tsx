import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cinemaStore } from '../services/store';
import { Movie, Showtime, Tenant, Hall, Screen, TenantRegistrationRequest } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  Film, Sparkles, MapPin, Calendar, Clock, Ticket, Search, 
  Play, Shield, Star, ChevronRight, Building2, Phone, Mail, 
  MessageCircle, CheckCircle2, ArrowRight, Send, Plus, KeyRound, Check, X,
  Compass, Globe, ChevronDown, CreditCard, AlertCircle
} from 'lucide-react';
import { getYouTubeEmbedUrl, getDirectYouTubeWatchUrl } from '../lib/youtube';
import { MALDIVES_ATOLLS, getIslandsByAtoll } from '../data/maldivesLocations';

export const HomePage: React.FC = () => {
  const { t, formatCurrency, isDhivehi } = useLanguage();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);

  // Filtering states: Atoll and Island
  const [selectedAtoll, setSelectedAtoll] = useState<string>('all');
  const [selectedIsland, setSelectedIsland] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovieForTrailer, setSelectedMovieForTrailer] = useState<Movie | null>(null);

  // Onboarding Request Modal State
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [submittedReq, setSubmittedReq] = useState<TenantRegistrationRequest | null>(null);
  const [reqPassword, setReqPassword] = useState('');
  const [reqConfirmPassword, setReqConfirmPassword] = useState('');
  const [reqSlipUrl, setReqSlipUrl] = useState('');
  const [reqFormError, setReqFormError] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [reqForm, setReqForm] = useState<{
    cinemaName: string;
    atoll: string;
    island: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string;
    subscriptionPlan: 'weekly' | 'monthly' | 'yearly' | 'one_month';
    paymentMethod: 'bml_transfer';
    notes: string;
  }>({
    cinemaName: '',
    atoll: 'Kaafu (K)',
    island: 'Malé City',
    contactPerson: '',
    contactPhone: '+960 ',
    contactEmail: '',
    subscriptionPlan: 'monthly',
    paymentMethod: 'bml_transfer',
    notes: ''
  });

  useEffect(() => {
    setMovies(cinemaStore.getMovies());
    setShowtimes(cinemaStore.getShowtimes());
    setTenants(cinemaStore.getTenants());
    setHalls(cinemaStore.getHalls());
    setScreens(cinemaStore.getScreens());

    const unsub = cinemaStore.subscribe(() => {
      setMovies(cinemaStore.getMovies());
      setShowtimes(cinemaStore.getShowtimes());
      setTenants(cinemaStore.getTenants());
      setHalls(cinemaStore.getHalls());
      setScreens(cinemaStore.getScreens());
    });
    return () => unsub();
  }, []);

  // Comprehensive list of all Maldivian atolls for main search dropdown
  const allMaldivesAtolls = MALDIVES_ATOLLS.map((a) => a.name);

  // Atolls that currently have registered active cinemas (for quick-filter pills)
  const activeCinemaAtolls = Array.from(
    new Set(
      tenants
        .map((t) => t.branding.atoll)
        .filter((atoll): atoll is string => Boolean(atoll && atoll.trim()))
    )
  ).sort();

  // Cascading Islands: User must select an Atoll first before islands are visible/selectable
  const availableIslands = selectedAtoll === 'all'
    ? []
    : getIslandsByAtoll(selectedAtoll);

  const handleAtollChange = (atoll: string) => {
    setSelectedAtoll(atoll);
    setSelectedIsland('all'); // Reset island filter when atoll changes
  };

  // Filtered movies based on Search, Atoll, and Island
  const filteredMovies = movies.filter((movie) => {
    // Only show published movies to the public (draft/private stay in tenant admin)
    if (movie.published === false) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitleEn = movie.titleEn.toLowerCase().includes(q);
      const matchTitleDv = movie.titleDv.toLowerCase().includes(q);
      const matchGenre = movie.genre.some((g) => g.toLowerCase().includes(q));
      if (!matchTitleEn && !matchTitleDv && !matchGenre) return false;
    }

    const movieShowtimes = showtimes.filter((s) => {
      if (s.movieId !== movie.id) return false;
      const tenant = tenants.find((t) => t.id === s.tenantId);
      return tenant && tenant.status !== 'suspended';
    });

    if (selectedAtoll !== 'all') {
      const matchesAtoll = movieShowtimes.some((s) => {
        const tenant = tenants.find((t) => t.id === s.tenantId);
        return tenant?.branding.atoll === selectedAtoll;
      });
      if (!matchesAtoll) return false;
    }

    if (selectedIsland !== 'all') {
      const matchesIsland = movieShowtimes.some((s) => {
        const tenant = tenants.find((t) => t.id === s.tenantId);
        return tenant?.branding.island === selectedIsland;
      });
      if (!matchesIsland) return false;
    }

    return true;
  });

  const handleSlipUploadForReq = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReqSlipUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle in-app request submission
  const handleSubmitInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqFormError('');

    if (!reqForm.cinemaName || !reqForm.contactPhone || !reqForm.contactEmail) {
      setReqFormError('Please fill in Cinema Name, Phone, and Email.');
      return;
    }

    if (!reqPassword || reqPassword.length < 6) {
      setReqFormError('Password must be at least 6 characters.');
      return;
    }

    if (reqPassword !== reqConfirmPassword) {
      setReqFormError('Passwords do not match.');
      return;
    }

    if (!reqSlipUrl) {
      setReqFormError('Please attach your BML transfer slip receipt as proof of payment.');
      return;
    }

    setIsSubmittingReq(true);
    try {
      const price = reqForm.subscriptionPlan === 'weekly' ? 149 : (reqForm.subscriptionPlan === 'yearly' || reqForm.subscriptionPlan === 'one_month') ? 499 : 249;
      const prefix = reqForm.cinemaName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'CIN';
      const genCode = `${prefix}-${Math.floor(10 + Math.random() * 89)}`;

      const req = cinemaStore.createTenantRequest({
        cinemaName: reqForm.cinemaName,
        tenantCode: genCode,
        atoll: reqForm.atoll,
        island: reqForm.island,
        contactPerson: reqForm.contactPerson || 'Manager',
        contactPhone: reqForm.contactPhone,
        contactEmail: reqForm.contactEmail.trim().toLowerCase(),
        passwordHash: reqPassword,
        subscriptionPlan: (reqForm.subscriptionPlan === 'one_month' ? 'yearly' : reqForm.subscriptionPlan) as any,
        subscriptionPriceMvr: price,
        paymentMethod: 'bml_transfer',
        paymentSlipUrl: reqSlipUrl,
        channel: 'in_app',
        notes: reqForm.notes
      });
      setSubmittedReq(req);
    } catch (err: any) {
      setReqFormError(err.message || 'Failed to submit registration request.');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // Handle WhatsApp request
  const handleSendWhatsApp = () => {
    const price = reqForm.subscriptionPlan === 'weekly' ? 149 : (reqForm.subscriptionPlan === 'yearly' || reqForm.subscriptionPlan === 'one_month') ? 499 : 249;
    const code = `TEN-${(reqForm.island || 'ISL').substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    cinemaStore.createTenantRequest({
      cinemaName: reqForm.cinemaName || 'New Cinema Organizer',
      atoll: reqForm.atoll,
      island: reqForm.island || 'Maldives',
      contactPerson: reqForm.contactPerson || 'Organizer',
      contactPhone: reqForm.contactPhone || '+960',
      contactEmail: reqForm.contactEmail || 'organizer@cinema.mv',
      subscriptionPlan: (reqForm.subscriptionPlan === 'one_month' ? 'yearly' : reqForm.subscriptionPlan) as any,
      subscriptionPriceMvr: price,
      paymentMethod: reqForm.paymentMethod,
      channel: 'whatsapp',
      tenantCode: code,
      notes: reqForm.notes
    });

    const text = encodeURIComponent(
      `*CinemaMV.online Cinema Organizer Onboarding Request*\n` +
      `Tenant Code: ${code}\n` +
      `Cinema / Hall: ${reqForm.cinemaName || 'New Cinema'}\n` +
      `Location: ${reqForm.atoll} - ${reqForm.island}\n` +
      `Contact: ${reqForm.contactPerson} (${reqForm.contactPhone})\n` +
      `Email: ${reqForm.contactEmail}\n` +
      `SaaS Plan: ${reqForm.subscriptionPlan.toUpperCase()} (MVR ${price})\n` +
      `Payment Choice: ${reqForm.paymentMethod.replace('_', ' ').toUpperCase()}\n` +
      `Notes: ${reqForm.notes || 'Ready to onboard'}`
    );
    window.open(`https://wa.me/9607771234?text=${text}`, '_blank');
  };

  // Handle Telegram request
  const handleSendTelegram = () => {
    const price = reqForm.subscriptionPlan === 'weekly' ? 149 : (reqForm.subscriptionPlan === 'yearly' || reqForm.subscriptionPlan === 'one_month') ? 499 : 249;
    const code = `TEN-${(reqForm.island || 'ISL').substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    cinemaStore.createTenantRequest({
      cinemaName: reqForm.cinemaName || 'New Cinema Organizer',
      atoll: reqForm.atoll,
      island: reqForm.island || 'Maldives',
      contactPerson: reqForm.contactPerson || 'Organizer',
      contactPhone: reqForm.contactPhone || '+960',
      contactEmail: reqForm.contactEmail || 'organizer@cinema.mv',
      subscriptionPlan: (reqForm.subscriptionPlan === 'one_month' ? 'yearly' : reqForm.subscriptionPlan) as any,
      subscriptionPriceMvr: price,
      paymentMethod: reqForm.paymentMethod,
      channel: 'telegram',
      tenantCode: code,
      notes: reqForm.notes
    });

    const text = encodeURIComponent(
      `CinemaMV.online Organizer Request - Code: ${code} - ${reqForm.cinemaName} (${reqForm.island}) - Plan: ${reqForm.subscriptionPlan} - Payment: ${reqForm.paymentMethod}`
    );
    window.open(`https://t.me/TicketsMVAdmin?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Showcase with Maldivian Cinema Aesthetic */}
      <section className="relative overflow-hidden pt-6 sm:pt-10 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-cyan-500/15 rounded-full blur-[90px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('hero.badge')}</span>
          </div>

          <h1 className={`text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight ${isDhivehi ? 'font-dhivehi leading-normal' : ''}`}>
            {t('hero.title')}
          </h1>

          <p className={`text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed ${isDhivehi ? 'font-dhivehi' : ''}`}>
            {t('hero.desc')}
          </p>

          {/* Mobile-First Search, Atoll & Island Filter Box */}
          <div className="pt-2 max-w-3xl mx-auto space-y-3">
            <div className="glass-panel p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-2.5 shadow-2xl border border-slate-800">
              {/* Keyword Search */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 text-xs sm:text-sm text-white placeholder:text-slate-500 border border-slate-700/60 focus:outline-none focus:border-teal-400 ${isDhivehi ? 'font-dhivehi pr-10 pl-4' : ''}`}
                />
              </div>

              {/* 1. Atoll Selector Dropdown */}
              <div className="relative w-full sm:w-auto">
                <Compass className="w-4 h-4 text-teal-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <select
                  value={selectedAtoll}
                  onChange={(e) => handleAtollChange(e.target.value)}
                  className="w-full sm:w-auto appearance-none pl-9 pr-9 py-2.5 rounded-xl bg-slate-900/90 text-xs font-bold text-teal-300 border border-slate-700/80 shadow-inner focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 cursor-pointer transition hover:border-slate-600"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All Atolls (ހުރިހާ އަތޮޅު)</option>
                  {allMaldivesAtolls.map((atoll) => (
                    <option key={atoll} value={atoll} className="bg-slate-900 text-slate-200">
                      {atoll}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* 2. Island Selector Dropdown - Requires Atoll First */}
              <div className="relative w-full sm:w-auto">
                <MapPin className={`w-4 h-4 ${selectedAtoll === 'all' ? 'text-slate-500' : 'text-cyan-400'} absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10`} />
                <select
                  value={selectedIsland}
                  disabled={selectedAtoll === 'all'}
                  onChange={(e) => setSelectedIsland(e.target.value)}
                  className={`w-full sm:w-auto appearance-none pl-9 pr-9 py-2.5 rounded-xl text-xs font-bold shadow-inner focus:outline-none transition ${
                    selectedAtoll === 'all'
                      ? 'bg-slate-900/40 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-70'
                      : 'bg-slate-900/90 text-cyan-300 border border-slate-700/80 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 cursor-pointer hover:border-slate-600'
                  }`}
                >
                  {selectedAtoll === 'all' ? (
                    <option value="all" className="bg-slate-900 text-slate-500">
                      Choose Atoll First (ފުރަތަމަ އަތޮޅު ހިޔާރުކުރައްވާ)
                    </option>
                  ) : (
                    <>
                      <option value="all" className="bg-slate-900 text-slate-200">
                        All Islands in {selectedAtoll} (ހުރިހާ ރަށް)
                      </option>
                      {availableIslands.map((isle) => (
                        <option key={isle} value={isle} className="bg-slate-900 text-slate-200">
                          {isle}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown className={`w-3.5 h-3.5 ${selectedAtoll === 'all' ? 'text-slate-600' : 'text-slate-400'} absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none`} />
              </div>
            </div>

            {/* Quick Atoll & Island Filter Pills - Zero Scroll Wrap */}
            <div className="space-y-2 pt-1">
              {/* Atoll quick selection */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center">
                  <Compass className="w-3.5 h-3.5 mr-1 text-teal-400 inline" />
                  Atoll:
                </span>
                <button
                  onClick={() => handleAtollChange('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                    selectedAtoll === 'all'
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>All Atolls</span>
                </button>
                {(activeCinemaAtolls.length > 0 ? activeCinemaAtolls : allMaldivesAtolls.slice(0, 6)).map((atoll) => (
                  <button
                    key={atoll}
                    onClick={() => handleAtollChange(atoll)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedAtoll === atoll
                        ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {atoll}
                  </button>
                ))}
              </div>

              {/* Island quick selection: only shown after choosing an atoll */}
              {selectedAtoll === 'all' ? (
                <div className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5 py-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Choose an atoll above to view islands (ރަށްތައް ފެންނާނީ ފުރަތަމަ އަތޮޅެއް ހިޔާރުކުރުމުން)</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs animate-fade-in">
                  <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-cyan-400 inline" />
                    Island ({selectedAtoll}):
                  </span>
                  <button
                    onClick={() => setSelectedIsland('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                      selectedIsland === 'all'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>All Islands in Atoll</span>
                  </button>
                  {availableIslands.map((isle) => (
                    <button
                      key={isle}
                      onClick={() => setSelectedIsland(isle)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                        selectedIsland === isle
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{isle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Now Showing Movies Section (Mobile-First Card Layout) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
              <Film className="w-5 h-5 text-teal-400" />
              <span>{t('nav.movies')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select showtime to view hall layout & pick seats ({filteredMovies.length} movies available)
            </p>
          </div>

          {(selectedAtoll !== 'all' || selectedIsland !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedAtoll('all');
                setSelectedIsland('all');
                setSearchQuery('');
              }}
              className="text-xs text-teal-400 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredMovies.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center border border-slate-800 space-y-3">
            <Film className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Movies Found in Selected Island / Atoll</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are currently no active screenings matching your selected filters. Try choosing "All Atolls" or another island.
            </p>
            <button
              onClick={() => {
                setSelectedAtoll('all');
                setSelectedIsland('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
            >
              Show All Island Screenings
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMovies.map((movie) => {
              const movieShowtimes = showtimes.filter((s) => {
                if (s.movieId !== movie.id) return false;
                const tenant = tenants.find((t) => t.id === s.tenantId);
                if (!tenant || tenant.status === 'suspended') return false;
                if (selectedAtoll !== 'all' && tenant?.branding.atoll !== selectedAtoll) return false;
                if (selectedIsland !== 'all' && tenant?.branding.island !== selectedIsland) return false;
                return true;
              });

              // Consolidate shared hall screens into 1 unified show session
              const groupedMovieSessions = (() => {
                const map = new Map<string, {
                  primaryShowtime: Showtime;
                  screens: Screen[];
                  hall?: Hall;
                  tenant?: Tenant;
                }>();

                movieShowtimes.forEach((st) => {
                  const key = `${st.hallId}_${st.date}_${st.startTime}`;
                  const scr = screens.find((s) => s.id === st.screenId);
                  if (!map.has(key)) {
                    map.set(key, {
                      primaryShowtime: st,
                      screens: scr ? [scr] : [],
                      hall: halls.find((h) => h.id === st.hallId),
                      tenant: tenants.find((t) => t.id === st.tenantId),
                    });
                  } else {
                    const entry = map.get(key)!;
                    if (scr && !entry.screens.some((s) => s.id === scr.id)) {
                      entry.screens.push(scr);
                    }
                  }
                });

                return Array.from(map.values());
              })();

              return (
                <div
                  key={movie.id}
                  className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    {/* 1. Panoramic Backdrop Banner & Badges */}
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                      <img
                        src={movie.backdropUrl || movie.posterUrl}
                        alt={`${movie.titleEn} backdrop`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/40 to-black/30" />

                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 text-teal-300 border border-teal-500/30 backdrop-blur-sm">
                          {movie.ageRating}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-500/30 flex items-center space-x-1 backdrop-blur-sm">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>Maldivian Premiere</span>
                        </span>
                      </div>

                      {movie.trailerYoutubeUrl && (
                        <button
                          onClick={() => setSelectedMovieForTrailer(movie)}
                          className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-500/90 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg transition z-10"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Trailer</span>
                        </button>
                      )}
                    </div>

                    {/* 2. Movie Header with Theatrical Vertical Poster & Details */}
                    <div className="p-5 pt-0 relative space-y-3">
                      {/* Flex row with vertical poster overlapping backdrop */}
                      <div className="flex items-start space-x-3.5 -mt-10 sm:-mt-12 relative z-20">
                        {/* Vertical 2:3 Movie Poster Artwork */}
                        <div className="relative w-20 sm:w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-slate-900 group-hover:border-teal-500/60 transition shadow-black/80">
                          <img
                            src={movie.posterUrl || movie.backdropUrl}
                            alt={`${movie.titleEn} poster`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Title & Key Specs next to poster */}
                        <div className="flex-1 pt-10 sm:pt-12 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-teal-300 transition truncate leading-snug">
                            {movie.titleEn}
                          </h3>
                          <p className="text-xs text-teal-400 font-dhivehi font-bold mt-0.5 truncate">
                            {movie.titleDv}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
                            <span className="flex items-center space-x-1 text-slate-300">
                              <Clock className="w-3 h-3 text-teal-400" />
                              <span>{movie.durationMinutes}m</span>
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[130px] text-slate-400">{movie.genre.slice(0, 2).join(', ')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Movie Synopsis */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-1">
                        {isDhivehi ? movie.synopsisDv : movie.synopsisEn}
                      </p>
                    </div>
                  </div>

                  {/* Available Showtimes Pill List */}
                  <div className="p-5 pt-0 border-t border-slate-800/80 mt-2 space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block pt-3">
                      Screenings & Tickets:
                    </span>

                    <div className="space-y-2">
                      {groupedMovieSessions.map((session) => {
                        const { primaryShowtime: st, screens: sessionScreens, hall, tenant } = session;
                        const isSharedHall = sessionScreens.length > 1;

                        return (
                          <Link
                            key={st.id}
                            to={`/book/${st.id}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-teal-950/30 border border-slate-800 hover:border-teal-500/40 transition group"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm font-bold text-teal-300">
                                  {st.startTime}
                                </span>
                                <span className="text-xs text-slate-400">• {st.date}</span>
                                {isSharedHall && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                    Shared Hall ({sessionScreens.length} Screens)
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
                                <span className="text-teal-400 font-bold">{tenant?.branding.island}:</span> {tenant?.name} ({isSharedHall ? hall?.name : (sessionScreens[0]?.screenName || hall?.name)})
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-bold text-amber-400 block">
                                {formatCurrency(st.priceTiers.standard)}
                              </span>
                              <span className="text-[10px] text-teal-400 group-hover:underline">
                                Pick Seats →
                              </span>
                            </div>
                          </Link>
                        );
                      })}

                      {groupedMovieSessions.length === 0 && (
                        <p className="text-xs text-slate-500 py-2">
                          No upcoming public showtimes in this selection.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Become an Organizer & Request Portal Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-10 border border-teal-500/30 bg-gradient-to-br from-[#0c1527] via-[#091120] to-[#060c18] space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span>For Island Councils, Cinemas & Film Organizers</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Host Your Cinema or Movie Event on CinemaMV.online
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Empower your island hall or cinema theater with our white-label SaaS platform. Create custom multi-screen seat maps, accept direct BML bank transfers with slip uploads, and check in attendees with mobile QR scanners. <strong>Zero ticket commissions</strong> — just a flat weekly or monthly subscription.
            </p>
          </div>

          {/* Core Organizer Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <h4 className="text-sm font-bold text-white">Direct Bank Transfers</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Money goes directly into your BML/MIB bank account with slip verification. Zero ticketing cut taken.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Multi-Screen Shared Hall</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Build shared room layouts with multiple screens, VIP/Standard tiers, and live 10-minute hold locking.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Door Staff QR Validator</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Check in moviegoers seamlessly at your hall entrance using any mobile smartphone camera.
              </p>
            </div>
          </div>

          {/* Action Box: Send Request via App, WhatsApp, or Telegram */}
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-teal-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Send Request with Payment of Your Choice:</span>
              </h3>
              <p className="text-xs text-slate-400">
                Choose Weekly (MVR 149), Monthly (MVR 249), or 1-Year Pass (MVR 499). Submit through our app, or send directly via WhatsApp or Telegram.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-200">
                <a
                  href="https://wa.me/9607771234?text=Hello%20CinemaMV.online%20Admin,%20I%20would%20like%20to%20register%20as%20a%20cinema%20organizer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp: +960 777-1234</span>
                </a>

                <a
                  href="https://t.me/TicketsMVAdmin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 text-sky-400 hover:text-sky-300 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram: @TicketsMVAdmin</span>
                </a>

                <a
                  href="tel:+9603301234"
                  className="flex items-center space-x-1.5 text-teal-400 hover:text-teal-300 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call: +960 330-1234</span>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/admin"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs text-center shadow-lg shadow-teal-500/25 transition active:scale-95 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Join as Organizer →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL: ORGANIZER ONBOARDING REQUEST (App, WhatsApp, or Telegram) */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Join as Cinema Organizer</h3>
                  <p className="text-[11px] text-slate-400">Receive unique code & start selling tickets</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedReq ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Registration Request Dispatched!</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    Your cinema request has been received. Our team will verify your details and activate your portal.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/40 max-w-xs mx-auto space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Your Assigned Tenant Code:
                  </span>
                  <div className="text-xl font-mono font-extrabold text-teal-300">
                    {submittedReq.tenantCode}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Save this code to easily sign in at /admin
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Confirm via WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setShowOnboardingModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitInApp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Cinema / Hall Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqForm.cinemaName}
                    onChange={(e) => setReqForm({ ...reqForm, cinemaName: e.target.value })}
                    placeholder="e.g. Fuvahmulah Community Hall"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Atoll *</label>
                    <select
                      value={reqForm.atoll}
                      onChange={(e) => {
                        const newAtoll = e.target.value;
                        const islands = getIslandsByAtoll(newAtoll);
                        setReqForm({
                          ...reqForm,
                          atoll: newAtoll,
                          island: islands[0] || ''
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    >
                      {MALDIVES_ATOLLS.map((atoll) => (
                        <option key={atoll.code} value={atoll.name}>
                          {atoll.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Island *</label>
                    <select
                      value={reqForm.island}
                      onChange={(e) => setReqForm({ ...reqForm, island: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    >
                      {getIslandsByAtoll(reqForm.atoll).map((isl) => (
                        <option key={isl} value={isl}>
                          {isl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      required
                      value={reqForm.contactPerson}
                      onChange={(e) => setReqForm({ ...reqForm, contactPerson: e.target.value })}
                      placeholder="e.g. Ahmed Ali"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Mobile Number (+960) *
                    </label>
                    <input
                      type="text"
                      required
                      value={reqForm.contactPhone}
                      onChange={(e) => setReqForm({ ...reqForm, contactPhone: e.target.value })}
                      placeholder="+960 777-1234"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={reqForm.contactEmail}
                    onChange={(e) => setReqForm({ ...reqForm, contactEmail: e.target.value })}
                    placeholder="cinema@island.mv"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                {/* Account Password for Organizer Access */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Account Password * <span className="text-slate-400 font-normal">(min 6 chars)</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={reqPassword}
                      onChange={(e) => setReqPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={reqConfirmPassword}
                      onChange={(e) => setReqConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                {/* Subscription Plan Choice */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Select SaaS Plan (0% Commission)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReqForm({ ...reqForm, subscriptionPlan: 'weekly' })}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        reqForm.subscriptionPlan === 'weekly'
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Weekly</div>
                      <div className="text-[10px] font-mono">MVR 149</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReqForm({ ...reqForm, subscriptionPlan: 'monthly' })}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        reqForm.subscriptionPlan === 'monthly'
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Monthly</div>
                      <div className="text-[10px] font-mono">MVR 249</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReqForm({ ...reqForm, subscriptionPlan: 'yearly' })}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        reqForm.subscriptionPlan === 'yearly' || reqForm.subscriptionPlan === 'one_month'
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">1-Year Pass</div>
                      <div className="text-[10px] font-mono">MVR 499</div>
                    </button>
                  </div>
                </div>

                {/* Live CinemaMV Platform Bank Details for Subscription Transfer */}
                {(() => {
                  const platBank = cinemaStore.getPlatformBankDetails();
                  const targetPrice = reqForm.subscriptionPlan === 'weekly' ? 149 : (reqForm.subscriptionPlan === 'yearly' || reqForm.subscriptionPlan === 'one_month') ? 499 : 249;
                  return (
                    <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-teal-300">
                        <span className="flex items-center space-x-1.5">
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span>Direct BML / MIB Bank Transfer</span>
                        </span>
                        <span className="text-sm font-black text-white">MVR {targetPrice}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-slate-400 block">Bank:</span>
                          <span className="font-semibold text-white">{platBank.bankName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Currency:</span>
                          <span className="font-semibold text-white">{platBank.currency}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Account Number:</span>
                          <span className="font-mono font-bold text-teal-300 text-sm">{platBank.accountNumber}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Account Name:</span>
                          <span className="font-semibold text-white">{platBank.accountName}</span>
                        </div>
                      </div>
                      {platBank.instructions && (
                        <div className="text-[11px] text-slate-400 italic pt-1 border-t border-teal-500/20">
                          {platBank.instructions}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Mandatory Transfer Slip Receipt Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Upload BML Transfer Slip Receipt <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={handleSlipUploadForReq}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500 file:text-slate-950 hover:file:bg-teal-400 cursor-pointer"
                  />
                  {reqSlipUrl && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
                      <img
                        src={reqSlipUrl}
                        alt="Receipt preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                      />
                      <span className="text-xs text-emerald-400 font-medium">✓ Receipt attached successfully</span>
                    </div>
                  )}
                </div>

                {reqFormError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reqFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Special Notes / Hall Requirements (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reqForm.notes}
                    onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                    placeholder="e.g. 2 screens in shared community hall, VIP sofa seats..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                {/* 3 Channels: In-App, WhatsApp, or Telegram */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Request via App (Instant Assigned Code)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Send via WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendTelegram}
                      className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send via Telegram</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Trailer Modal */}
      {selectedMovieForTrailer && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {selectedMovieForTrailer.titleEn} ({selectedMovieForTrailer.titleDv}) - Official Trailer
                </h3>
              </div>
              <button
                onClick={() => setSelectedMovieForTrailer(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <iframe
                src={getYouTubeEmbedUrl(selectedMovieForTrailer.trailerYoutubeUrl)}
                title={`${selectedMovieForTrailer.titleEn} Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-400">
              <span>Having trouble with embedded video playback?</span>
              <a
                href={getDirectYouTubeWatchUrl(selectedMovieForTrailer.trailerYoutubeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 font-bold underline flex items-center space-x-1"
              >
                <span>Watch Directly on YouTube</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
