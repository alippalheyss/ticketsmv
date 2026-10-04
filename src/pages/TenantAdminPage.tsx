import React, { useState, useEffect } from 'react';
import { 
  Tenant, Hall, Screen, Movie, Showtime, Booking, BankDetails, SubscriptionModel 
} from '../types';
import { cinemaStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';
import { SeatMatrixBuilder } from '../components/SeatMatrixBuilder';
import { 
  Building2, Film, Calendar, Users, Sliders, ExternalLink, Plus, Edit3, 
  Download, DollarSign, Upload, MapPin, Check, Ban, Trash2, LayoutGrid, 
  CreditCard, Sparkles, AlertCircle, AlertTriangle, Copy, Image, Play, CheckCircle2, X, LogOut, Lock, KeyRound,
  Globe, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const TenantAdminPage: React.FC = () => {
  const { formatCurrency } = useLanguage();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem('mv_tenant_auth'));
  });

  const getInitialTenantId = (): string => {
    try {
      const saved = sessionStorage.getItem('mv_tenant_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return parsed.id;
      }
    } catch {}
    return '';
  };

  const [loginCode, setLoginCode] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(getInitialTenantId);
  const [activeTab, setActiveTab] = useState<'screens' | 'scheduler' | 'movies' | 'branding' | 'sales' | 'slips'>('screens');

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Modals & Editors
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [showAddHallModal, setShowAddHallModal] = useState(false);
  const [showAddScreenModal, setShowAddScreenModal] = useState(false);
  const [targetHallIdForNewScreen, setTargetHallIdForNewScreen] = useState<string>('');
  const [showAddShowtimeModal, setShowAddShowtimeModal] = useState(false);
  
  // Movie Artwork Customization Modal
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showMovieEditModal, setShowMovieEditModal] = useState(false);

  // In-app Delete Confirmation Dialog State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'screen' | 'showtime' | 'movie';
    id: string;
    title: string;
  } | null>(null);

  // New Hall Form
  const [newHallName, setNewHallName] = useState('');
  const [newHallIsland, setNewHallIsland] = useState('');
  const [newHallAtoll, setNewHallAtoll] = useState('');
  const [newHallAddress, setNewHallAddress] = useState('');

  // New Screen in Hall Form
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenPosition, setNewScreenPosition] = useState<'left' | 'center' | 'right' | 'front' | 'balcony'>('center');
  const [newScreenRows, setNewScreenRows] = useState(5);
  const [newScreenCols, setNewScreenCols] = useState(6);

  // New Showtime Form
  const [newShowMovieId, setNewShowMovieId] = useState('');
  const [newShowScreenId, setNewShowScreenId] = useState('');
  const [newShowDate, setNewShowDate] = useState(new Date().toISOString().split('T')[0]);
  const [newShowTime, setNewShowTime] = useState('20:30');
  const [newShowStandardPrice, setNewShowStandardPrice] = useState(100);
  const [newShowVipPrice, setNewShowVipPrice] = useState(150);

  // Branding & Bank Details Form State
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    slug: '',
    island: '',
    atoll: '',
    contactPhone: '',
    contactViber: '',
    logoUrl: '',
    bannerUrl: '',
    terms: '',
  });

  const [bankForm, setBankForm] = useState<BankDetails>({
    bankName: 'Bank of Maldives (BML)',
    accountNumber: '',
    accountName: '',
    currency: 'MVR',
    instructions: '',
    qrImageUrl: '',
  });

  // Additional Cinema Slots & Chain Expansion Form
  const [showBuySlotModal, setShowBuySlotModal] = useState(false);
  const [newSlotCinemaName, setNewSlotCinemaName] = useState('');
  const [newSlotIsland, setNewSlotIsland] = useState('');
  const [newSlotAtoll, setNewSlotAtoll] = useState('Kaafu (K)');
  const [newSlotPhone, setNewSlotPhone] = useState('');
  const [slotError, setSlotError] = useState('');
  const [isActivatingSlot, setIsActivatingSlot] = useState(false);

  // Movie Customization Form State
  const [movieForm, setMovieForm] = useState<Movie>({
    id: '',
    titleEn: '',
    titleDv: '',
    synopsisEn: '',
    synopsisDv: '',
    posterUrl: '',
    backdropUrl: '',
    durationMinutes: 120,
    ageRating: 'PG-13',
    trailerYoutubeUrl: '',
    cast: [],
    genre: [],
    releaseDate: new Date().toISOString().split('T')[0],
    published: true
  });

  const refreshData = () => {
    const allT = cinemaStore.getTenants();
    setTenants(allT);

    const saved = sessionStorage.getItem('mv_tenant_auth');
    let sessionTenant: Tenant | null = null;
    if (saved) {
      try { sessionTenant = JSON.parse(saved); } catch {}
    }

    // Filter to only cinemas owned by the logged-in organizer
    const myTenants = sessionTenant
      ? allT.filter((t) => t.ownerEmail.toLowerCase() === (sessionTenant?.ownerEmail || '').toLowerCase())
      : allT;

    setTenants(myTenants);

    const activeT = 
      (selectedTenantId && myTenants.find((t) => t.id === selectedTenantId)) || 
      myTenants[0] || 
      sessionTenant;

    if (activeT) {
      setCurrentTenant(activeT);
      if (!selectedTenantId || selectedTenantId !== activeT.id) {
        setSelectedTenantId(activeT.id);
      }

      setBrandingForm({
        name: activeT.name,
        slug: activeT.slug,
        island: activeT.branding.island,
        atoll: activeT.branding.atoll,
        contactPhone: activeT.branding.contactPhone,
        contactViber: activeT.branding.contactViber,
        logoUrl: activeT.branding.logoUrl,
        bannerUrl: activeT.branding.bannerUrl,
        terms: activeT.branding.terms,
      });

      if (activeT.branding.bankDetails) {
        setBankForm(activeT.branding.bankDetails);
      } else {
        setBankForm({
          bankName: 'Bank of Maldives (BML)',
          accountNumber: '7701 1928 4401 001',
          accountName: activeT.name,
          currency: 'MVR',
          instructions: 'Please mention booking reference ID in transfer remarks.',
        });
      }

      const hList = cinemaStore.getHalls(activeT.id);
      setHalls(hList);
      if (hList.length > 0 && !targetHallIdForNewScreen) {
        setTargetHallIdForNewScreen(hList[0].id);
      }

      const sList = cinemaStore.getScreens().filter((s) => s.tenantId === activeT.id);
      setScreens(sList);

      // Strictly isolate movies to this tenant or global shared catalogue
      setMovies(cinemaStore.getMovies(activeT.id));
      setShowtimes(cinemaStore.getShowtimes(activeT.id));
      setBookings(cinemaStore.getBookings(activeT.id));
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = cinemaStore.subscribe(() => {
      refreshData();
    });
    return () => unsub();
  }, [selectedTenantId]);

  // Picture Upload Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandingForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandingForm((prev) => ({ ...prev, bannerUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBankQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBankForm((prev) => ({ ...prev, qrImageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Movie Artwork Upload Handlers (Poster & Background Backdrop)
  const handleMoviePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMovieForm((prev) => ({ ...prev, posterUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMovieBackdropUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMovieForm((prev) => ({ ...prev, backdropUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Movie Editor
  const handleOpenMovieEditor = (movie?: Movie) => {
    if (movie) {
      setMovieForm({ ...movie });
    } else {
      setMovieForm({
        id: `movie-${Date.now()}`,
        tenantId: currentTenant?.id,
        titleEn: '',
        titleDv: '',
        synopsisEn: '',
        synopsisDv: '',
        posterUrl: '',
        backdropUrl: '',
        durationMinutes: 120,
        ageRating: 'PG-13',
        trailerYoutubeUrl: '',
        cast: [],
        genre: [],
        releaseDate: new Date().toISOString().split('T')[0],
        published: true
      });
    }
    setShowMovieEditModal(true);
  };

  // Save Movie Artwork & Details
  const handleSaveMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieForm.titleEn) return;

    const movieToSave: Movie = {
      ...movieForm,
      tenantId: currentTenant?.id
    };

    cinemaStore.saveMovie(movieToSave);
    setMovies(cinemaStore.getMovies(currentTenant?.id));
    setShowMovieEditModal(false);
    alert(`Movie "${movieForm.titleEn}" artwork and details saved successfully!`);
  };

  // Re-roll random subdomain for Free Users
  const handleRerollRandomSlug = () => {
    if (!currentTenant) return;
    const newSlug = `hall-${Math.floor(100 + Math.random() * 899)}`;
    setBrandingForm(prev => ({ ...prev, slug: newSlug }));
    const updated: Tenant = {
      ...currentTenant,
      slug: newSlug
    };
    setCurrentTenant(updated);
    cinemaStore.saveTenant(updated);
    sessionStorage.setItem('mv_tenant_auth', JSON.stringify(updated));
    alert(`Assigned new random subdomain: ${newSlug}.cinemamv.online`);
    refreshData();
  };

  // Handle Branding & Bank Save
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    const isFreeUser = currentTenant.tier === 'free' || currentTenant.subscriptionModel === 'free_trial';
    let targetSlug = currentTenant.slug;

    if (!isFreeUser) {
      const cleanSlug = brandingForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (!cleanSlug) {
        alert('Please enter a valid subdomain for your cinema.');
        return;
      }
      const isAvail = cinemaStore.isSlugAvailable(cleanSlug, currentTenant.id);
      if (!isAvail) {
        alert(`The subdomain "${cleanSlug}" is already taken by another cinema. Please choose another.`);
        return;
      }
      targetSlug = cleanSlug;
    }

    const updated: Tenant = {
      ...currentTenant,
      name: brandingForm.name,
      slug: targetSlug,
      branding: {
        ...currentTenant.branding,
        island: brandingForm.island,
        atoll: brandingForm.atoll,
        contactPhone: brandingForm.contactPhone,
        contactViber: brandingForm.contactViber,
        logoUrl: brandingForm.logoUrl,
        bannerUrl: brandingForm.bannerUrl,
        terms: brandingForm.terms,
        bankDetails: bankForm,
      }
    };

    cinemaStore.saveTenant(updated);
    sessionStorage.setItem('mv_tenant_auth', JSON.stringify(updated));
    setCurrentTenant(updated);
    alert('Branding, Subdomain, and Bank Details saved successfully!');
    refreshData();
  };

  // Add Hall
  const handleCreateHall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    // Free User Limitation: Max 1 Hall
    if ((currentTenant.tier === 'free' || currentTenant.subscriptionModel === 'free_trial') && halls.length >= 1) {
      alert("Free users are limited to 1 cinema hall. Multi-hall support is available on Paid Plans (Weekly MVR 149, Monthly MVR 249, or 1-Year Pass MVR 499).");
      return;
    }

    const newHall: Hall = {
      id: `hall-${Date.now()}`,
      tenantId: currentTenant.id,
      name: newHallName,
      island: newHallIsland || currentTenant.branding.island,
      atoll: newHallAtoll || currentTenant.branding.atoll,
      address: newHallAddress,
      contactPhone: currentTenant.branding.contactPhone,
    };

    cinemaStore.saveHall(newHall);
    setShowAddHallModal(false);
    setNewHallName('');
    setNewHallAddress('');
    refreshData();
  };

  // Add Screen to a Hall
  const handleCreateScreenInHall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !targetHallIdForNewScreen) return;

    // Free User Limitation: Max 1 Screen
    if ((currentTenant.tier === 'free' || currentTenant.subscriptionModel === 'free_trial') && screens.length >= 1) {
      alert("Free users are limited to 1 screen. Multi-screen setups (Screen 1, Screen 2, Screen 3 in shared halls) are available on Paid Plans (Weekly MVR 149, Monthly MVR 249, or 1-Year Pass MVR 499).");
      return;
    }

    const rowAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const newSeats = [];
    for (let r = 0; r < newScreenRows; r++) {
      const rowChar = rowAlphabet[r];
      for (let c = 1; c <= newScreenCols; c++) {
        newSeats.push({
          id: `${rowChar}-${c}`,
          row: rowChar,
          col: c,
          type: (r === 0 ? 'vip' : 'standard') as any,
          active: true
        });
      }
    }

    const newScreen: Screen = {
      id: `screen-${Date.now()}`,
      hallId: targetHallIdForNewScreen,
      tenantId: currentTenant.id,
      screenName: newScreenName || `Screen ${screens.length + 1}`,
      screenNumber: screens.filter(s => s.hallId === targetHallIdForNewScreen).length + 1,
      positionInHall: newScreenPosition,
      layout: {
        rows: newScreenRows,
        cols: newScreenCols,
        rowLabels: rowAlphabet.slice(0, newScreenRows),
        seats: newSeats,
        screenPosition: 'top',
        stageName: `${newScreenName.toUpperCase()} STAGE`
      }
    };

    cinemaStore.saveScreen(newScreen);
    setShowAddScreenModal(false);
    setNewScreenName('');
    refreshData();
    setEditingScreen(newScreen);
  };

  // IN-APP DELETION CONFIRMATION EXECUTION
  const executeConfirmedDelete = () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'screen') {
      cinemaStore.deleteScreen(deleteConfirmation.id);
      setScreens(prev => prev.filter(s => s.id !== deleteConfirmation.id));
      setShowtimes(prev => prev.filter(st => st.screenId !== deleteConfirmation.id));
    } else if (deleteConfirmation.type === 'showtime') {
      cinemaStore.deleteShowtime(deleteConfirmation.id);
      setShowtimes(prev => prev.filter(st => st.id !== deleteConfirmation.id));
    } else if (deleteConfirmation.type === 'movie') {
      cinemaStore.deleteMovie(deleteConfirmation.id);
      setMovies(prev => prev.filter(m => m.id !== deleteConfirmation.id));
      setShowtimes(prev => prev.filter(st => st.movieId !== deleteConfirmation.id));
    }

    setDeleteConfirmation(null);
    refreshData();
  };

  // Create Showtime
  const handleCreateShowtime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !newShowMovieId || !newShowScreenId) return;

    const targetScreen = screens.find((s) => s.id === newShowScreenId);
    if (!targetScreen) return;

    const newShow: Showtime = {
      id: `show-${Date.now()}`,
      movieId: newShowMovieId,
      screenId: newShowScreenId,
      hallId: targetScreen.hallId,
      tenantId: currentTenant.id,
      date: newShowDate,
      startTime: newShowTime,
      endTime: '22:45',
      priceTiers: {
        standard: newShowStandardPrice,
        vip: newShowVipPrice,
        couple: newShowStandardPrice * 2.2,
        accessible: newShowStandardPrice * 0.8,
      },
      status: 'scheduled'
    };

    cinemaStore.saveShowtime(newShow);
    setShowAddShowtimeModal(false);
    refreshData();
  };

  // Cancel Showtime
  const handleCancelShowtime = (showtimeId: string) => {
    cinemaStore.cancelShowtime(showtimeId);
    refreshData();
  };

  // Switch Subscription Model (Weekly, Monthly, 1-Year Pass)
  const handleSwitchSubscription = (model: SubscriptionModel) => {
    if (!currentTenant) return;
    let price = 249;
    if (model === 'weekly') price = 149;
    if (model === 'monthly') price = 249;
    if (model === 'yearly' || model === 'one_month') price = 499;
    if (model === 'free_trial') price = 0;

    cinemaStore.updateTenantSubscription(currentTenant.id, model, price);
    refreshData();
    alert(`Subscription plan updated to: ${model.toUpperCase()} (MVR ${price}). No ticket fees are charged.`);
  };

  // Purchase Extra Cinema Slot & Expand Chain
  const handlePurchaseSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setSlotError('');
    if (!newSlotCinemaName.trim() || !newSlotIsland.trim()) {
      setSlotError('Please provide cinema name and island location.');
      return;
    }

    if (!currentTenant) return;

    setIsActivatingSlot(true);
    try {
      const created = cinemaStore.purchaseCinemaSlot(currentTenant.ownerEmail, {
        name: newSlotCinemaName.trim(),
        island: newSlotIsland.trim(),
        atoll: newSlotAtoll,
        contactPhone: newSlotPhone.trim() || currentTenant.branding.contactPhone
      });

      refreshData();
      setSelectedTenantId(created.id);
      setShowBuySlotModal(false);
      setNewSlotCinemaName('');
      setNewSlotIsland('');
      setNewSlotPhone('');
      alert(`🎉 Cinema Slot Activated! You can now manage "${created.name}" (${created.tenantCode}) alongside your other cinema.`);
    } catch {
      setSlotError('Failed to activate cinema slot. Please try again.');
    } finally {
      setIsActivatingSlot(false);
    }
  };

  // Export Attendees to CSV
  const handleExportCSV = () => {
    const headers = ['Booking Ref', 'Guest Name', 'Email', 'Phone', 'Seats', 'Total (MVR)', 'Payment Status', 'Gate Checked In'];
    const rows = bookings.map((b) => [
      b.bookingRef,
      `"${b.guestName}"`,
      b.guestEmail,
      b.guestPhone,
      `"${b.seats.map(s => s.label).join(', ')}"`,
      b.totalAmount.toFixed(2),
      b.paymentStatus,
      b.checkedIn ? 'YES' : 'NO'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTenant?.slug}_attendees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTenantLogin = async (e?: React.FormEvent, customTenant?: Tenant) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (customTenant) {
      sessionStorage.setItem('mv_tenant_auth', JSON.stringify(customTenant));
      setSelectedTenantId(customTenant.id);
      setIsAuthenticated(true);
      return;
    }

    const query = loginCode.trim().toLowerCase();
    if (!query) {
      setLoginError('Please enter your Cinema Code or Owner Email');
      return;
    }

    if (isSupabaseConfigured() && query.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({
        email: query,
        password: loginPass
      });
      if (error) {
        setLoginError(error.message);
        return;
      }
    }

    const allTenantsList = cinemaStore.getTenants();
    const found = allTenantsList.find(
      (t) =>
        t.tenantCode?.toLowerCase() === query ||
        t.ownerEmail.toLowerCase() === query ||
        t.slug.toLowerCase() === query
    );

    if (!found) {
      setLoginError(`No cinema organizer found for "${loginCode}". Check your email or contact Super Admin.`);
      return;
    }

    sessionStorage.setItem('mv_tenant_auth', JSON.stringify(found));
    setSelectedTenantId(found.id);
    setIsAuthenticated(true);
    refreshData();
  };

  const handleTenantLogout = () => {
    sessionStorage.removeItem('mv_tenant_auth');
    setIsAuthenticated(false);
  };

  // IF NOT AUTHENTICATED: DISPLAY ORGANIZER LOGIN GATE FIRST
  if (!isAuthenticated || !currentTenant) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto shadow-xl">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Cinema Organizer Login
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter your unique Tenant Recognition Code or owner email to manage your screens, showtimes, and bank details.
          </p>
        </div>

        {loginError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleTenantLogin} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Cinema Tenant Code or Owner Email
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                placeholder="e.g. OLY-01 or organizer@cinemamv.online"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Security PIN / Password
            </label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition active:scale-95"
          >
            Enter Cinema Dashboard →
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/" className="text-xs text-slate-400 hover:text-white transition underline">
            ← Return to Public Movie Booking Site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Sleek Minimalist Top Header (Mobile-Optimized) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{currentTenant.name}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                {currentTenant.tenantCode || 'OLY-01'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {currentTenant.branding.island}, {currentTenant.branding.atoll}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
          {(() => {
            const myTenants = tenants.filter(
              (t) => t.ownerEmail.toLowerCase() === (currentTenant.ownerEmail || '').toLowerCase()
            );
            const totalAllowedSlots = currentTenant.cinemaSlots || Math.max(1, myTenants.length);

            return (
              <>
                {myTenants.length <= 1 ? (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>{currentTenant.tenantCode || 'ORG'} • {currentTenant.name}</span>
                  </div>
                ) : (
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-teal-400 font-mono"
                    title="Switch between your managed cinemas"
                  >
                    {myTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tenantCode || 'ORG'} • {t.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowBuySlotModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-teal-500/20 hover:from-amber-500/30 hover:to-teal-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-sm"
                  title="Expand chain: Buy an extra cinema management slot"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Add Cinema</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-amber-200 border border-amber-500/30 font-mono">
                    Slot ({myTenants.length}/{totalAllowedSlots})
                  </span>
                </button>
              </>
            );
          })()}

          <Link
            to={`/t/${currentTenant.slug}`}
            target="_blank"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portal</span>
          </Link>

          <button
            onClick={handleTenantLogout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
            title="Sign out of Cinema Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Prominent Cinema Suspension Alert Banner */}
      {currentTenant.status === 'suspended' && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-white">Cinema Portal Suspended by Platform Super Admin</h4>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Online ticket sales and public bookings for <strong>{currentTenant.name}</strong> are temporarily disabled. Please contact Super Admin at alippalhey@gmail.com to reactivate.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/25 text-amber-200 text-xs font-bold border border-amber-500/40 whitespace-nowrap self-start sm:self-auto">
            STATUS: SUSPENDED
          </span>
        </div>
      )}

      {/* Navigation Tabs - Mobile First, Zero Horizontal Scroll */}
      <div className="space-y-2 pb-2 border-b border-slate-800">
        {/* Fixed 6-column icon grid that perfectly fits any mobile screen without horizontal scrolling */}
        <div className="grid grid-cols-6 gap-1 sm:gap-2 w-full">
          <button
            onClick={() => setActiveTab('screens')}
            title={`Halls & Multi-Screens (${screens.length})`}
            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-xl transition-all duration-200 ${
              activeTab === 'screens'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-1 leading-none">
              {screens.length > 0 ? screens.length : 'Halls'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('movies')}
            title={`Customize Show Pictures & Background (${movies.length})`}
            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-xl transition-all duration-200 ${
              activeTab === 'movies'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Image className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-1 leading-none">
              {movies.length > 0 ? movies.length : 'Media'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scheduler')}
            title={`Showtimes & Cancel/Delete (${showtimes.length})`}
            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-xl transition-all duration-200 ${
              activeTab === 'scheduler'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Calendar className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-1 leading-none">
              {showtimes.length > 0 ? showtimes.length : 'Shows'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            title="Branding & Bank Details (Picture Upload)"
            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-xl transition-all duration-200 ${
              activeTab === 'branding'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Sliders className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-1 leading-none">Bank</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            title="Attendees & Reports"
            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-xl transition-all duration-200 ${
              activeTab === 'sales'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-1 leading-none">Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('slips')}
            title="Bank Transfer Slips"
            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-xl transition-all duration-200 ${
              activeTab === 'slips'
                ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800'
            }`}
          >
            <DollarSign className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-1 leading-none">Slips</span>
          </button>
        </div>

        {/* Active Tab Name Display (Prominently shows the full tab name with zero horizontal scroll) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center space-x-2 text-xs font-bold text-white min-w-0">
            <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
            <span className="truncate text-slate-200 font-extrabold">
              {activeTab === 'screens' && `Halls & Multi-Screens (${screens.length})`}
              {activeTab === 'movies' && `Customize Show Pictures & Background (${movies.length})`}
              {activeTab === 'scheduler' && `Showtimes & Cancel/Delete (${showtimes.length})`}
              {activeTab === 'branding' && 'Branding & Bank Details (Picture Upload)'}
              {activeTab === 'sales' && 'Attendees & Reports'}
              {activeTab === 'slips' && 'Bank Transfer Slips'}
            </span>
          </div>
          <span className="text-[10px] text-teal-400 font-mono uppercase tracking-wider shrink-0 ml-2">
            Active Tab
          </span>
        </div>
      </div>

      {/* TAB 1: HALLS & MULTI-SCREEN LAYOUT ENGINE */}
      {activeTab === 'screens' && (
        <div className="space-y-6">
          {editingScreen ? (
            <SeatMatrixBuilder
              screen={editingScreen}
              onSave={(updated) => {
                cinemaStore.saveScreen(updated);
                setEditingScreen(null);
                refreshData();
              }}
              onCancel={() => setEditingScreen(null)}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <LayoutGrid className="w-5 h-5 text-teal-400" />
                    <span>Halls & Multi-Screen Room Layout</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    One hall room can contain 2, 3, or more screens (e.g. Left Wing, Center Stage, Right Wing). When users book, they can see all screens in the shared room on one page.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAddHallModal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
                  >
                    + Add New Hall
                  </button>
                  <button
                    onClick={() => {
                      if (halls.length > 0) setTargetHallIdForNewScreen(halls[0].id);
                      setShowAddScreenModal(true);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Screen to Hall</span>
                  </button>
                </div>
              </div>

              {/* Halls and their multiple screens */}
              <div className="space-y-8">
                {halls.map((hall) => {
                  const hallScreens = screens.filter((s) => s.hallId === hall.id);
                  const isMultiScreenSharedHall = hallScreens.length > 1;

                  return (
                    <div key={hall.id} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-bold text-white">{hall.name}</h3>
                            {isMultiScreenSharedHall && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                                Shared Room: {hallScreens.length} Screens
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {hall.island} ({hall.atoll}) • {hall.address}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setTargetHallIdForNewScreen(hall.id);
                            setShowAddScreenModal(true);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold border border-teal-500/30 transition self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Screen into This Hall</span>
                        </button>
                      </div>

                      {/* Screen cards for editing & deleting */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {hallScreens.map((sc) => {
                          const totalCapacity = sc.layout.seats.filter(s => s.active && s.type !== 'aisle').length;
                          return (
                            <div key={sc.id} className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm text-white">{sc.screenName}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono">
                                    Position: {sc.positionInHall || 'Center'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                  Grid: <strong className="text-slate-200">{sc.layout.rows} Rows x {sc.layout.cols} Cols</strong>
                                  <br />
                                  Seating Capacity: <strong className="text-teal-400">{totalCapacity} seats</strong>
                                </p>
                              </div>

                              <div className="flex items-center space-x-2 pt-2">
                                <button
                                  onClick={() => setEditingScreen(sc)}
                                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-bold border border-teal-500/30 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit Matrix</span>
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmation({
                                    type: 'screen',
                                    id: sc.id,
                                    title: sc.screenName
                                  })}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition border border-slate-700"
                                  title="Delete screen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOVIE ARTWORK & BACKGROUND CUSTOMIZATION (PICTURE UPLOAD) */}
      {activeTab === 'movies' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Image className="w-5 h-5 text-teal-400" />
                <span>Customize Movie Posters & Background Pictures</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organizers can upload custom poster pictures and hero background graphics directly from their phone or computer.
              </p>
            </div>
            <button
              onClick={() => handleOpenMovieEditor()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Movie</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((mv) => (
              <div key={mv.id} className="glass-panel rounded-3xl overflow-hidden border border-slate-800 flex flex-col justify-between">
                <div>
                  {/* Backdrop Preview */}
                  <div className="relative h-36 bg-slate-950 overflow-hidden">
                    <img
                      src={mv.backdropUrl || mv.posterUrl}
                      alt={mv.titleEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                      {mv.ageRating}
                    </span>
                  </div>

                  {/* Poster + Info */}
                  <div className="p-5 -mt-10 relative z-10 space-y-3">
                    <div className="flex space-x-3 items-end">
                      <img
                        src={mv.posterUrl}
                        alt={mv.titleEn}
                        className="w-16 h-24 object-cover rounded-xl border-2 border-teal-500/40 shadow-xl flex-shrink-0 bg-slate-900"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-white truncate">{mv.titleEn}</h3>
                        <p className="font-dhivehi text-xs text-teal-400 truncate">{mv.titleDv}</p>
                        <p className="text-[11px] text-slate-400">{mv.durationMinutes} mins</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {mv.synopsisEn}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenMovieEditor(mv)}
                    className="flex-1 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-bold border border-teal-500/30 transition flex items-center justify-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Customize Pictures & Details</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmation({
                      type: 'movie',
                      id: mv.id,
                      title: mv.titleEn
                    })}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition border border-slate-700"
                    title="Delete Movie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHOWTIME SCHEDULER (WITH CANCEL AND DELETE BUTTONS) */}
      {activeTab === 'scheduler' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Showtimes & Screenings</h2>
              <p className="text-xs text-slate-400">
                Schedule shows, cancel screenings, or delete unneeded showtimes.
              </p>
            </div>
            <button
              onClick={() => {
                if (movies.length > 0) setNewShowMovieId(movies[0].id);
                if (screens.length > 0) setNewShowScreenId(screens[0].id);
                setShowAddShowtimeModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Showtime</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {showtimes.map((st) => {
              const movie = movies.find((m) => m.id === st.movieId);
              const screen = screens.find((s) => s.id === st.screenId);
              const hall = halls.find((h) => h.id === st.hallId);
              const isCancelled = st.status === 'cancelled';

              return (
                <div key={st.id} className={`glass-panel rounded-2xl p-4 border transition space-y-3 ${
                  isCancelled ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'
                }`}>
                  <div className="flex space-x-3">
                    <img
                      src={movie?.posterUrl}
                      alt={movie?.titleEn}
                      className="w-16 h-24 object-cover rounded-lg border border-slate-700 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCancelled ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {st.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white truncate mt-1">{movie?.titleEn}</h4>
                      <p className="font-dhivehi text-xs text-teal-400 truncate">{movie?.titleDv}</p>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{screen?.screenName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{hall?.name}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-xl p-2.5 text-xs space-y-1.5 border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date & Time:</span>
                      <span className="font-mono font-bold text-white">{st.date} @ {st.startTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pricing:</span>
                      <span className="text-teal-400 font-semibold">
                        Std {formatCurrency(st.priceTiers.standard)} | VIP {formatCurrency(st.priceTiers.vip)}
                      </span>
                    </div>
                  </div>

                  {/* Cancel & Delete Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                    <Link
                      to={`/book/${st.id}`}
                      className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-center text-xs font-semibold text-teal-300 transition"
                    >
                      View Seat Map
                    </Link>

                    {!isCancelled && (
                      <button
                        onClick={() => handleCancelShowtime(st.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-amber-400 text-xs font-semibold border border-amber-500/30 transition"
                        title="Cancel this showtime"
                      >
                        Cancel Show
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteConfirmation({
                        type: 'showtime',
                        id: st.id,
                        title: `${movie?.titleEn || 'Show'} on ${st.date} @ ${st.startTime}`
                      })}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
                      title="Permanently delete showtime"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOM BRANDING & BANK DETAILS (WITH DIRECT PICTURE UPLOAD) */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="space-y-8 max-w-4xl">
          {/* Cinema Profile & SaaS Plan Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">Active Cinema Profile</span>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2 mt-0.5">
                  <span>{currentTenant.name}</span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {currentTenant.tenantCode || 'OLY-01'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  100% of ticket sales are paid directly to your cinema bank account. No booking commission fees.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current SaaS Plan:</span>
                <span className="text-sm font-bold text-white">
                  {currentTenant.subscriptionModel === 'weekly' ? 'Weekly Plan (MVR 149 / wk)' :
                   currentTenant.subscriptionModel === 'yearly' || currentTenant.subscriptionModel === 'one_month' ? '1-Year Annual Pass (MVR 499 / yr)' :
                   currentTenant.subscriptionModel === 'monthly' ? 'Monthly Plan (MVR 249 / mo)' :
                   'Free Plan (3-Day Free Trial / Fallback)'}
                </span>
              </div>
            </div>

            {/* Switch Plan Quick Buttons */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">Switch Subscription Plan:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchSubscription('free_trial')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    currentTenant.subscriptionModel === 'free_trial' || currentTenant.tier === 'free'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-amber-300/80 border-slate-800 hover:bg-slate-800'
                  }`}
                  title="Downgrade to Free Tier (Restricts Pro Features)"
                >
                  Free Plan (0)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSubscription('weekly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    currentTenant.subscriptionModel === 'weekly'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Weekly (MVR 149/wk)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSubscription('monthly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    currentTenant.subscriptionModel === 'monthly'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Monthly (MVR 249/mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSubscription('yearly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    currentTenant.subscriptionModel === 'yearly' || currentTenant.subscriptionModel === 'one_month'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  1-Year Pass (MVR 499)
                </button>
              </div>
            </div>

            {/* Free Plan notice if applicable */}
            {(currentTenant.tier === 'free' || currentTenant.subscriptionModel === 'free_trial') && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Free Plan active: limited to 1 hall, 1 screen, up to 100 seats, and random subdomain.</span>
              </div>
            )}
          </div>
          {/* Section 1: Direct Picture Uploads for Branding */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-teal-400" />
                <span>Upload Logo & Banner Pictures Directly</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organizers can simply upload image files directly from their computer or phone without needing URL links.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Cinema Logo Image
                </label>
                <div className="flex items-center space-x-4">
                  <img
                    src={brandingForm.logoUrl || 'https://via.placeholder.com/150'}
                    alt="Logo Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-950 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Click to upload png, jpg, webp</span>
                  </div>
                </div>
              </div>

              {/* Banner Upload Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Banner Graphic Image
                </label>
                <div className="flex items-center space-x-4">
                  <img
                    src={brandingForm.bannerUrl || 'https://via.placeholder.com/300x100'}
                    alt="Banner Preview"
                    className="w-24 h-16 rounded-xl object-cover border border-slate-700 bg-slate-950 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Hero backdrop for public portal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Portal details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Cinema Name</label>
                <input
                  type="text"
                  value={brandingForm.name}
                  onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-teal-500"
                />
              </div>

              {/* Subdomain Management */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-teal-400 shrink-0" />
                    <label className="text-xs font-bold text-slate-200">
                      Subdomain & Public Sublink Management
                    </label>
                  </div>
                  {currentTenant.tier === 'free' || currentTenant.subscriptionModel === 'free_trial' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                      Random Subdomain (Free User)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 self-start sm:self-auto">
                      Custom Subdomain (Paid Tier Feature)
                    </span>
                  )}
                </div>

                {currentTenant.tier === 'free' || currentTenant.subscriptionModel === 'free_trial' ? (
                  /* FREE USER: RANDOM SUBDOMAIN LOCKED WITH RE-ROLL */
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Assigned Random Subdomain:</span>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-sm font-bold">
                            {currentTenant.slug}.cinemamv.online
                          </span>
                          <button
                            type="button"
                            onClick={handleRerollRandomSlug}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95 flex items-center space-x-1.5"
                            title="Generate a different random subdomain"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Re-roll Random Domain</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs max-w-sm">
                        <p className="font-bold flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Need a custom branded domain?</span>
                        </p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Free users get random domains. Upgrade to Weekly (MVR 149), Monthly (MVR 249), or 1-Year Pass (MVR 499) to choose your own custom name (e.g. <code>olympus.cinemamv.online</code>).
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Public sublink: <Link to={`/t/${currentTenant.slug}`} target="_blank" className="font-mono text-teal-400 hover:underline">cinemamv.online/t/{currentTenant.slug} ↗</Link>
                    </div>
                  </div>
                ) : (
                  /* PAID USER: CUSTOM SUBDOMAIN EDITABLE WITH LIVE AVAILABILITY CHECK */
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Enter Custom Subdomain (letters, numbers, hyphens):
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500 font-mono hidden sm:inline">https://</span>
                        <input
                          type="text"
                          value={brandingForm.slug}
                          onChange={(e) => {
                            const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                            setBrandingForm({ ...brandingForm, slug: clean });
                          }}
                          placeholder="your-cinema-name"
                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-teal-300 font-mono font-bold text-sm focus:outline-none focus:border-teal-400 w-full sm:w-64"
                        />
                        <span className="text-xs text-slate-400 font-mono font-bold">.cinemamv.online</span>
                      </div>
                    </div>

                    {/* Real-time availability indicator */}
                    <div className="text-xs">
                      {brandingForm.slug ? (
                        cinemaStore.isSlugAvailable(brandingForm.slug, currentTenant.id) ? (
                          <div className="text-emerald-400 flex items-center space-x-1.5 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>"{brandingForm.slug}.cinemamv.online" is available and can be saved!</span>
                          </div>
                        ) : (
                          <div className="text-rose-400 flex items-center space-x-1.5 font-semibold">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Subdomain "{brandingForm.slug}" is already taken by another cinema. Please pick another.</span>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-500 text-[11px]">Enter your desired custom subdomain name.</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Public sublink: <Link to={`/t/${brandingForm.slug}`} target="_blank" className="font-mono text-teal-400 hover:underline">cinemamv.online/t/{brandingForm.slug} ↗</Link>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Island</label>
                <input
                  type="text"
                  value={brandingForm.island}
                  onChange={(e) => setBrandingForm({ ...brandingForm, island: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Atoll</label>
                <input
                  type="text"
                  value={brandingForm.atoll}
                  onChange={(e) => setBrandingForm({ ...brandingForm, atoll: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={brandingForm.contactPhone}
                  onChange={(e) => setBrandingForm({ ...brandingForm, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Viber</label>
                <input
                  type="text"
                  value={brandingForm.contactViber}
                  onChange={(e) => setBrandingForm({ ...brandingForm, contactViber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Custom Bank Account Details & QR Transfer Picture */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span>Customize Cinema Bank Account Details</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                These bank details will be shown to guest users during checkout when paying via manual bank transfer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bank Name</label>
                <select
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400"
                >
                  <option value="Bank of Maldives (BML)">Bank of Maldives (BML)</option>
                  <option value="Maldives Islamic Bank (MIB)">Maldives Islamic Bank (MIB)</option>
                  <option value="State Bank of India (SBI Malé)">State Bank of India (SBI Malé)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="e.g. 7701 1928 4401 001"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                  placeholder="e.g. Olympus Cinema Pvt Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Currency</label>
                <input
                  type="text"
                  disabled
                  value="Maldivian Rufiyaa (MVR)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Transfer Instructions / Remarks Guide for Guests
                </label>
                <textarea
                  rows={2}
                  value={bankForm.instructions || ''}
                  onChange={(e) => setBankForm({ ...bankForm, instructions: e.target.value })}
                  placeholder="e.g. Please write booking reference in remarks memo."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-400"
                />
              </div>

              {/* Upload BML QR Picture */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Upload Bank Transfer QR Code Picture (Optional)
                </label>
                <div className="flex items-center space-x-4">
                  {bankForm.qrImageUrl && (
                    <img
                      src={bankForm.qrImageUrl}
                      alt="Bank QR"
                      className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-slate-700"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBankQrUpload}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30"
                  />
                </div>
              </div>
            </div>
          </div>

            {/* Platform Policy Notice: No Self-Deletion of Cinema Entities */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-200">Cinema Deletion & Decommissioning Policy</span>
                <p className="leading-relaxed">
                  Cinema entities cannot be removed from organizer settings to protect active customer bookings and gate verification records. Only Super Admin has authorization to permanently delete or decommission cinemas on the platform. To request cinema deletion, contact <span className="text-teal-400 font-mono font-bold">alippalhey@gmail.com</span>.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-teal-500/20 transition active:scale-95"
            >
              Save Branding & Bank Details
            </button>
          </form>
      )}

      {/* TAB 5: SALES & ATTENDEE REPORTS */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Attendee & Ticket Sales</h2>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Mobile No</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-teal-400">{b.bookingRef}</td>
                    <td className="px-4 py-3 font-bold text-white">{b.guestName}</td>
                    <td className="px-4 py-3 font-mono text-cyan-300 font-semibold">{b.guestPhone || '+960 777-1234'}</td>
                    <td className="px-4 py-3">{b.seats.map(s => s.label).join(', ')}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(b.totalAmount)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">{b.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: BANK TRANSFER SLIPS */}
      {activeTab === 'slips' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white">Bank Transfer Slips Pending Approval</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.filter(b => b.paymentMethod === 'bml_transfer').map((b) => (
              <div key={b.id} className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex justify-between">
                  <span className="font-mono font-bold text-amber-400">{b.bookingRef}</span>
                  <span className="font-bold text-white">{b.guestName}</span>
                </div>
                <p className="text-xs text-slate-300">Amount: {formatCurrency(b.totalAmount)}</p>
                {b.slipUrl && (
                  <img src={b.slipUrl} alt="Slip" className="w-full h-40 object-cover rounded-xl border border-slate-700" />
                )}
                {b.paymentStatus === 'pending_verification' && (
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => cinemaStore.updateBookingPaymentStatus(b.id, 'paid')}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Approve Slip
                    </button>
                    <button
                      onClick={() => cinemaStore.updateBookingPaymentStatus(b.id, 'expired')}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-rose-400 text-xs"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: MOVIE ARTWORK & BACKGROUND CUSTOMIZATION */}
      {showMovieEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleSaveMovie} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Image className="w-5 h-5 text-teal-400" />
                <span>Customize Movie Pictures & Artwork</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMovieEditModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Picture Upload Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Poster Upload Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Upload Movie Poster Picture
                </label>
                <div className="flex items-center space-x-3">
                  {movieForm.posterUrl ? (
                    <img
                      src={movieForm.posterUrl}
                      alt="Poster Preview"
                      className="w-16 h-24 object-cover rounded-xl border border-teal-500/40 bg-slate-900 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-xl border border-dashed border-slate-700 bg-slate-900 flex items-center justify-center text-[10px] text-slate-500 text-center p-1">
                      No Poster
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMoviePosterUpload}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Portrait poster for listings</span>
                  </div>
                </div>
              </div>

              {/* Background / Backdrop Upload Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Upload Movie Background / Backdrop
                </label>
                <div className="flex items-center space-x-3">
                  {movieForm.backdropUrl ? (
                    <img
                      src={movieForm.backdropUrl}
                      alt="Backdrop Preview"
                      className="w-24 h-16 object-cover rounded-xl border border-teal-500/40 bg-slate-900 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-16 rounded-xl border border-dashed border-slate-700 bg-slate-900 flex items-center justify-center text-[10px] text-slate-500 text-center p-1">
                      No Backdrop
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMovieBackdropUpload}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Hero banner background</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Titles & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title (English) *</label>
                <input
                  type="text"
                  required
                  value={movieForm.titleEn}
                  onChange={(e) => setMovieForm({ ...movieForm, titleEn: e.target.value })}
                  placeholder="e.g. Kamanaa (The Beloved)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title (Dhivehi Thaana) *</label>
                <input
                  type="text"
                  required
                  value={movieForm.titleDv}
                  onChange={(e) => setMovieForm({ ...movieForm, titleDv: e.target.value })}
                  placeholder="e.g. ކަމަނާ"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-dhivehi"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Age Rating</label>
                <select
                  value={movieForm.ageRating}
                  onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                >
                  <option value="G">G - General Audience</option>
                  <option value="PG">PG - Parental Guidance</option>
                  <option value="PG-13">PG-13</option>
                  <option value="15+">15+ Mature</option>
                  <option value="18+">18+ Adults</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={movieForm.durationMinutes}
                  onChange={(e) => setMovieForm({ ...movieForm, durationMinutes: parseInt(e.target.value) || 120 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">YouTube Trailer Link</label>
                <input
                  type="url"
                  value={movieForm.trailerYoutubeUrl}
                  onChange={(e) => setMovieForm({ ...movieForm, trailerYoutubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Movie Genres (Comma separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(movieForm.genre) ? movieForm.genre.join(', ') : ''}
                  onChange={(e) => setMovieForm({
                    ...movieForm,
                    genre: e.target.value.split(',').map((g) => g.trim()).filter(Boolean)
                  })}
                  placeholder="e.g. Action, Comedy, Horror"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Cast Actors (Comma separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(movieForm.cast) ? movieForm.cast.join(', ') : ''}
                  onChange={(e) => setMovieForm({
                    ...movieForm,
                    cast: e.target.value.split(',').map((c) => c.trim()).filter(Boolean)
                  })}
                  placeholder="e.g. Actor 1, Actor 2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              {/* Publish / Private Toggle */}
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-white">Movie Publication Status</label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {movieForm.published !== false
                      ? '🟢 Live: Screened publicly on the main landing page & booking portal'
                      : '🔒 Private / Draft: Saved in your admin panel, hidden from public ticket buyers'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMovieForm(prev => ({ ...prev, published: prev.published === false ? true : false }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border shrink-0 ${
                    movieForm.published !== false
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-800 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {movieForm.published !== false ? '🟢 Live (Published)' : '🔒 Private (Draft)'}
                </button>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Synopsis (English)</label>
                <textarea
                  rows={2}
                  value={movieForm.synopsisEn}
                  onChange={(e) => setMovieForm({ ...movieForm, synopsisEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Synopsis (Dhivehi Thaana)</label>
                <textarea
                  rows={2}
                  value={movieForm.synopsisDv}
                  onChange={(e) => setMovieForm({ ...movieForm, synopsisDv: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-dhivehi"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMovieEditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Save Movie Artwork
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: IN-APP DELETE CONFIRMATION (RELIABLE & CLEAN) */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Delete {deleteConfirmation.type === 'screen' ? 'Screen' : deleteConfirmation.type === 'showtime' ? 'Showtime' : 'Movie'}?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently remove <strong className="text-white">"{deleteConfirmation.title}"</strong>?
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SCREEN TO HALL */}
      {showAddScreenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateScreenInHall} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <LayoutGrid className="w-5 h-5 text-teal-400" />
              <span>Add Screen into Hall Room</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target Hall Room</label>
              <select
                value={targetHallIdForNewScreen}
                onChange={(e) => setTargetHallIdForNewScreen(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              >
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Screen Name</label>
              <input
                type="text"
                required
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                placeholder="e.g. Screen 1 (Left Wing) or Screen 3 (Right Wing)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Room Position in Shared Hall
              </label>
              <select
                value={newScreenPosition}
                onChange={(e) => setNewScreenPosition(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              >
                <option value="left">Left Wing (West side of room)</option>
                <option value="center">Center Main Stage</option>
                <option value="right">Right Wing (East side of room)</option>
                <option value="balcony">Balcony Upper Level</option>
                <option value="front">Front Stage</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Grid Rows</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={newScreenRows}
                  onChange={(e) => setNewScreenRows(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Grid Columns</label>
                <input
                  type="number"
                  min={2}
                  max={25}
                  value={newScreenCols}
                  onChange={(e) => setNewScreenCols(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddScreenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Add Screen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD HALL */}
      {showAddHallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateHall} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Cinema Hall</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Hall Name</label>
              <input
                type="text"
                required
                value={newHallName}
                onChange={(e) => setNewHallName(e.target.value)}
                placeholder="e.g. Olympus Main Auditorium"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Island</label>
                <input
                  type="text"
                  required
                  value={newHallIsland}
                  onChange={(e) => setNewHallIsland(e.target.value)}
                  placeholder="e.g. Malé"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Atoll</label>
                <input
                  type="text"
                  required
                  value={newHallAtoll}
                  onChange={(e) => setNewHallAtoll(e.target.value)}
                  placeholder="e.g. Kaafu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddHallModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Create Hall
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD SHOWTIME */}
      {showAddShowtimeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateShowtime} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Schedule Movie Showtime</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Movie</label>
              <select
                value={newShowMovieId}
                onChange={(e) => setNewShowMovieId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              >
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.titleEn} ({m.titleDv})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Screen & Hall</label>
              <select
                value={newShowScreenId}
                onChange={(e) => setNewShowScreenId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
              >
                {screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.screenName} ({halls.find(h => h.id === s.hallId)?.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={newShowDate}
                  onChange={(e) => setNewShowDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Time Slot</label>
                <input
                  type="time"
                  value={newShowTime}
                  onChange={(e) => setNewShowTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Price (MVR)</label>
                <input
                  type="number"
                  value={newShowStandardPrice}
                  onChange={(e) => setNewShowStandardPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">VIP Price (MVR)</label>
                <input
                  type="number"
                  value={newShowVipPrice}
                  onChange={(e) => setNewShowVipPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddShowtimeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: BUY ADDITIONAL CINEMA SLOT & EXPAND CHAIN */}
      {showBuySlotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
          <form
            onSubmit={handlePurchaseSlot}
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowBuySlotModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Multi-Cinema Expansion</span>
              </div>
              <h3 className="text-xl font-extrabold text-white">Purchase Additional Cinema Slot</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                By default, each organizer account can operate 1 cinema. Purchase an extra cinema slot to manage a second cinema branch, island hall, or open-air screen under your same account.
              </p>
            </div>

            {/* Pricing badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950 to-teal-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Slot Fee</span>
                <span className="text-lg font-black text-amber-300">MVR 249</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold">
                +1 Cinema Management Slot
              </span>
            </div>

            {slotError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{slotError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Cinema / Hall Name *</label>
                <input
                  type="text"
                  required
                  value={newSlotCinemaName}
                  onChange={(e) => setNewSlotCinemaName(e.target.value)}
                  placeholder="e.g. Olympus Rooftop Lounge or Velidhoo Screen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Island Location *</label>
                  <input
                    type="text"
                    required
                    value={newSlotIsland}
                    onChange={(e) => setNewSlotIsland(e.target.value)}
                    placeholder="e.g. Hulhumalé or Eydhafushi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Atoll *</label>
                  <select
                    value={newSlotAtoll}
                    onChange={(e) => setNewSlotAtoll(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Kaafu (K)">Kaafu (K)</option>
                    <option value="Alif Alif (AA)">Alif Alif (AA)</option>
                    <option value="Alif Dhaal (ADh)">Alif Dhaal (ADh)</option>
                    <option value="Baa (B)">Baa (B)</option>
                    <option value="Haa Alif (HA)">Haa Alif (HA)</option>
                    <option value="Haa Dhaalu (HDh)">Haa Dhaalu (HDh)</option>
                    <option value="Shaviyani (Sh)">Shaviyani (Sh)</option>
                    <option value="Noonu (N)">Noonu (N)</option>
                    <option value="Raa (R)">Raa (R)</option>
                    <option value="Lhaviyani (Lh)">Lhaviyani (Lh)</option>
                    <option value="Vaavu (V)">Vaavu (V)</option>
                    <option value="Meemu (M)">Meemu (M)</option>
                    <option value="Faafu (F)">Faafu (F)</option>
                    <option value="Dhaalu (Dh)">Dhaalu (Dh)</option>
                    <option value="Thaa (Th)">Thaa (Th)</option>
                    <option value="Laamu (L)">Laamu (L)</option>
                    <option value="Gaafu Alif (GA)">Gaafu Alif (GA)</option>
                    <option value="Gaafu Dhaalu (GDh)">Gaafu Dhaalu (GDh)</option>
                    <option value="Gnaviyani (Gn)">Gnaviyani (Gn)</option>
                    <option value="Seenu (S)">Seenu (S)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  value={newSlotPhone}
                  onChange={(e) => setNewSlotPhone(e.target.value)}
                  placeholder="e.g. +960 777-1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBuySlotModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActivatingSlot}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {isActivatingSlot ? 'Activating Slot...' : 'Purchase Slot & Add Cinema →'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
