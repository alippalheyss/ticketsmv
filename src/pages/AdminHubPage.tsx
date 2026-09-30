import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, QrCode, Lock, ChevronRight, Sparkles, 
  Film, LogOut, CheckCircle2, AlertCircle, KeyRound, ArrowRight,
  ShieldCheck, Zap, Users, Smartphone, CreditCard, Clock,
  MapPin, Check, X, Phone, Mail, MessageCircle, Send, Plus
} from 'lucide-react';
import { cinemaStore } from '../services/store';
import { Tenant, TenantRegistrationRequest, Hall, Screen } from '../types';

export const AdminHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentSessionTenant, setCurrentSessionTenant] = useState<Tenant | null>(null);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isFreeTrialModalOpen, setIsFreeTrialModalOpen] = useState(false);
  const [selectedPlanForRegister, setSelectedPlanForRegister] = useState<'weekly' | 'monthly' | 'one_month'>('monthly');

  // Free trial form state (free user with limitations)
  const [trialCinemaName, setTrialCinemaName] = useState('');
  const [trialIsland, setTrialIsland] = useState('');
  const [trialAtoll, setTrialAtoll] = useState('');
  const [trialOwnerName, setTrialOwnerName] = useState('');
  const [trialOwnerPhone, setTrialOwnerPhone] = useState('');
  const [trialOwnerEmail, setTrialOwnerEmail] = useState('');
  const [trialFormError, setTrialFormError] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register request form state
  const [cinemaName, setCinemaName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [island, setIsland] = useState('');
  const [atoll, setAtoll] = useState('');
  const [chosenPaymentMethod, setChosenPaymentMethod] = useState<'bml_transfer' | 'bml_gateway' | 'mfaisaa' | 'cash'>('bml_transfer');
  const [registrationSubmitted, setRegistrationSubmitted] = useState<TenantRegistrationRequest | null>(null);

  useEffect(() => {
    const allTenants = cinemaStore.getTenants();
    setTenants(allTenants);

    const savedAuth = sessionStorage.getItem('mv_tenant_auth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        const matched = allTenants.find((t) => t.id === parsed.id || t.tenantCode === parsed.tenantCode);
        if (matched) {
          setCurrentSessionTenant(matched);
        }
      } catch {}
    }
  }, []);

  const handleLogin = (e?: React.FormEvent, customTenant?: Tenant) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (customTenant) {
      sessionStorage.setItem('mv_tenant_auth', JSON.stringify(customTenant));
      setCurrentSessionTenant(customTenant);
      setIsLoginModalOpen(false);
      return;
    }

    const query = loginIdentifier.trim().toLowerCase();
    if (!query) {
      setLoginError('Please enter your Cinema Code or Email Address');
      return;
    }

    const found = tenants.find(
      (t) =>
        t.tenantCode?.toLowerCase() === query ||
        t.ownerEmail.toLowerCase() === query ||
        t.slug.toLowerCase() === query
    );

    if (!found) {
      setLoginError(`No cinema organizer found with code or email "${loginIdentifier}". Try demo code: OLY-01`);
      return;
    }

    sessionStorage.setItem('mv_tenant_auth', JSON.stringify(found));
    setCurrentSessionTenant(found);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mv_tenant_auth');
    setCurrentSessionTenant(null);
    setLoginIdentifier('');
    setLoginPassword('');
  };

  const handleCreateFreeTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialCinemaName.trim() || !trialOwnerPhone.trim()) {
      setTrialFormError('Please enter your Cinema / Hall name and Maldivian contact phone number.');
      return;
    }

    // Generate random slug for free user e.g. "hall-482"
    const randomSlug = `hall-${Math.floor(100 + Math.random() * 899)}`;
    const randomCode = `TRL-${Math.floor(10 + Math.random() * 89)}`;
    const newTenantId = `tenant-${Date.now()}`;

    const newTenant: Tenant = {
      id: newTenantId,
      name: trialCinemaName.trim(),
      slug: randomSlug,
      tenantCode: randomCode,
      tier: 'free',
      status: 'active',
      subscriptionModel: 'free_trial',
      subscriptionPriceMvr: 0,
      subscriptionBillingDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      ownerEmail: trialOwnerEmail.trim() || `${randomSlug}@trial.tickets.mv`,
      branding: {
        logoUrl: '',
        bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
        primaryColor: '#0d9488',
        contactPhone: trialOwnerPhone.trim(),
        contactViber: trialOwnerPhone.trim(),
        island: trialIsland.trim() || 'Malé',
        atoll: trialAtoll.trim() || 'Kaafu',
        terms: '3-Day Free Trial Account (Limited to 1 Hall, 1 Screen, up to 100 seats).',
        taglineEn: 'Island Cinema (Free Trial)',
        taglineDv: 'ރަށު ސިނަމާ (ޓްރަޔަލް)'
      }
    };

    // Auto-seed initial 1 Hall and 1 Screen for free trial user with 100 seats
    const newHall: Hall = {
      id: `hall-${Date.now()}`,
      tenantId: newTenantId,
      name: `${trialCinemaName.trim()} Main Hall`,
      island: trialIsland.trim() || 'Malé',
      atoll: trialAtoll.trim() || 'Kaafu',
      address: `${trialIsland.trim() || 'Malé'}, Maldives`,
      contactPhone: trialOwnerPhone.trim()
    };

    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const newScreen: Screen = {
      id: `screen-${Date.now()}`,
      hallId: newHall.id,
      tenantId: newTenantId,
      screenName: 'Screen 1',
      screenNumber: 1,
      positionInHall: 'center',
      layout: {
        rows: 10,
        cols: 10,
        rowLabels: rowLetters,
        seats: rowLetters.flatMap((row, rIdx) =>
          Array.from({ length: 10 }, (_, cIdx) => ({
            id: `${row}-${cIdx + 1}`,
            row,
            col: cIdx + 1,
            type: (rIdx >= 8 ? 'vip' : 'standard') as 'vip' | 'standard',
            active: true
          }))
        ),
        screenPosition: 'top',
        stageName: 'MAIN STAGE'
      }
    };

    cinemaStore.saveTenant(newTenant);
    cinemaStore.saveHall(newHall);
    cinemaStore.saveScreen(newScreen);

    // Save session & login immediately
    sessionStorage.setItem('mv_tenant_auth', JSON.stringify(newTenant));
    setCurrentSessionTenant(newTenant);
    setIsFreeTrialModalOpen(false);
    navigate('/tenant-admin');
  };

  const handleOpenRegister = (plan: 'weekly' | 'monthly' | 'one_month' = 'monthly') => {
    setSelectedPlanForRegister(plan);
    setRegistrationSubmitted(null);
    setIsRegisterModalOpen(true);
  };

  const handleSubmitAppRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cinemaName || !ownerPhone) return;

    const prefix = cinemaName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'CIN';
    const genCode = `${prefix}-${Math.floor(10 + Math.random() * 89)}`;
    const price = selectedPlanForRegister === 'weekly' ? 149 : selectedPlanForRegister === 'one_month' ? 550 : 499;

    const req = cinemaStore.createTenantRequest({
      cinemaName,
      contactPerson: ownerName || 'Manager',
      contactEmail: ownerEmail || `${cinemaName.toLowerCase().replace(/\s+/g, '')}@tickets.mv`,
      contactPhone: ownerPhone,
      island: island || 'Malé',
      atoll: atoll || 'Kaafu',
      subscriptionPlan: selectedPlanForRegister,
      subscriptionPriceMvr: price,
      paymentMethod: chosenPaymentMethod,
      channel: 'in_app',
      tenantCode: genCode,
    });

    setRegistrationSubmitted(req);
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello Tickets.mv! I want to register as a Cinema Organizer.\n\n` +
      `Cinema / Hall: ${cinemaName || 'My Cinema Hall'}\n` +
      `Organizer: ${ownerName || 'Manager'}\n` +
      `Island: ${island || 'Malé'} (${atoll || 'Kaafu'})\n` +
      `Phone: ${ownerPhone || '+960'}\n` +
      `Plan: ${selectedPlanForRegister.toUpperCase()} (Zero Commission)\n` +
      `Preferred Payment: ${chosenPaymentMethod.replace('_', ' ').toUpperCase()}`
    );
    window.open(`https://wa.me/9607771234?text=${text}`, '_blank');
  };

  const handleOpenTelegram = () => {
    window.open('https://t.me/TicketsMVAdmin', '_blank');
  };

  // IF USER IS ALREADY LOGGED IN: SHOW THEIR AUTHENTICATED ORGANIZER DASHBOARD
  if (currentSessionTenant) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
        {/* Active Session Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-teal-500/30 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white">{currentSessionTenant.name}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Code: {currentSessionTenant.tenantCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentSessionTenant.branding.island} • {currentSessionTenant.subscriptionModel.toUpperCase()} Plan (Zero Commission)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              Switch Cinema
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/40 text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Organizer Management Portal
          </h1>
          <p className="text-xs text-slate-400">
            Welcome back to your ticketing console. Manage screens, showtimes, bank details, and scan door tickets.
          </p>
        </div>

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Card 1: Cinema Organizer Portal */}
          <Link
            to="/tenant-admin"
            className="group glass-panel rounded-3xl p-6 border border-slate-800 hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
                  Full Cinema Control Center
                </span>
                <h2 className="text-xl font-bold text-white mt-1 group-hover:text-teal-300 transition">
                  Manage Cinema Dashboard
                </h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure shared halls & multi-screens, add/cancel shows, upload custom movie pictures, manage bank transfer slips, and export attendee reports with mobile numbers.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-teal-400 group-hover:underline">
              <span>Open Cinema Dashboard →</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Door Staff QR Validator */}
          <Link
            to="/validator"
            className="group glass-panel rounded-3xl p-6 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  Gatekeepers & Ushers
                </span>
                <h2 className="text-xl font-bold text-white mt-1 group-hover:text-amber-300 transition">
                  Door QR Scanner
                </h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mobile camera-based ticket validation tool with audio beeps and duplicate-use detection to check in guests at hall entrance gates.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:underline">
              <span>Launch Door Scanner →</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* View Public Page & Return Link */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-slate-800 text-xs text-slate-400">
          <Link
            to={`/t/${currentSessionTenant.slug}`}
            className="hover:text-teal-300 transition underline flex items-center space-x-1"
          >
            <span>Preview Public Cinema Link (/t/{currentSessionTenant.slug})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link to="/" className="hover:text-white transition underline">
            ← Return to Public Movie Booking Site
          </Link>
        </div>
      </div>
    );
  }

  const handleScrollToPlans = () => {
    const el = document.getElementById('subscription-plans-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // IF NOT LOGGED IN: SHOW RICH PROMOTIONAL / PRESENTATION LANDING PAGE WITH PLANS + LOGIN POPUP
  return (
    <div className="space-y-16 pb-20 animate-fadeIn">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero Ticket Commission • Flat Weekly or Monthly Subscriptions</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
          The Complete Ticketing & Screening Platform for{' '}
          <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
            Maldivian Cinemas & Island Halls
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Host film screenings in Malé or any island atoll. Build interactive multi-screen seat maps, accept BML bank transfer slips with 1-click approvals, and check in attendees with mobile QR passes.
        </p>

        {/* Primary Action Button - Smoothly scrolls to subscription plans at the bottom */}
        <div className="flex flex-col items-center justify-center gap-3 pt-3">
          <button
            onClick={handleScrollToPlans}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-base shadow-2xl shadow-teal-500/30 transition transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2.5 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
            <span>Start your 3-day free trial</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Free user sandbox • Random subdomain • 1 hall limit</span>
            <span>•</span>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="text-teal-400 hover:underline font-semibold"
            >
              Already registered? Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid - Pack as much features to attract users */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Everything You Need to Sell Out Your Screenings
          </h2>
          <p className="text-xs text-slate-400">
            Engineered specifically for Maldivian island venues, community auditoriums, and commercial cinemas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">0% Ticket Commission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keep 100% of your ticket sales. Unlike other platforms that extract 5% to 15% cuts per ticket, Tickets.mv operates on flat, predictable SaaS subscriptions.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Screen Shared Halls</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Host Screen 1, Screen 2, and Screen 3 in a single shared hall or open-air space. Customers switch screens seamlessly with custom row and seat numbers.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">BML Bank Transfer Slips & Gateway</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patrons easily upload BML or MIB bank transfer receipts. Review receipt pictures in your dashboard and approve tickets with a single click.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">10-Minute Live Seat Locks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prevent double-booking chaos during rush premieres. Selected seats are held securely in real-time across all devices while the guest completes payment.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Door QR Scanner Included</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ushers and gate staff use any smartphone camera to scan tamper-proof QR tickets at the door. Audio feedback and duplicate pass prevention built right in.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-teal-500/40 transition space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Attendee Mobile & Reports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Capture Maldivian mobile numbers (7xxxxxx, 9xxxxxx) and emails for all bookings. Export customer lists for WhatsApp show announcements and SMS alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Subscription Plans Section - 3-Day Free Trial, Weekly, Monthly, 1-Month */}
      <section id="subscription-plans-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-20">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Transparent Island SaaS Plans</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Choose the Right Plan for Your Cinema
          </h2>
          <p className="text-xs text-slate-400">
            No long-term contracts. No percentage taken from your tickets. Pay via BML Transfer, MIB, Gateway, or Cash.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Plan 0: 3-Day Free Trial */}
          <div className="glass-panel rounded-3xl p-6 border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900/60 to-slate-900/90 flex flex-col justify-between space-y-6 transition hover:border-amber-400 shadow-xl shadow-amber-500/5">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-block">
                3-Day Free Trial
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">MVR 0</span>
                  <span className="text-xs text-slate-400">/ 3 days free</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full sandbox to test hall seat maps, mobile QR scanning, and booking flows.
                </p>
              </div>

              {/* Available & Non-Available Features */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block mb-1.5">
                    Available Features:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>1 Cinema Hall</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>1 Screen Room (Screen 1)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Full Access to 100 Seats</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Mobile QR Door Scanner</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Standard BML Bank Slips</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Random Assigned Subdomain</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block mb-1.5">
                    Non-Available Features:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-center space-x-2 line-through">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Custom Branded Subdomain</span>
                    </li>
                    <li className="flex items-center space-x-2 line-through">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Multi-Screen Shared Halls</span>
                    </li>
                    <li className="flex items-center space-x-2 line-through">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Multiple Cinema Halls</span>
                    </li>
                    <li className="flex items-center space-x-2 line-through">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Unlimited Ticket Sales</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setTrialFormError('');
                setIsFreeTrialModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              Activate Free Trial →
            </button>
          </div>
          {/* Plan 1: Weekly */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-6 transition">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Weekly Pass
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">MVR 149</span>
                  <span className="text-xs text-slate-400">/ 7 days</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ideal for Eid film festivals, school holiday runs, or weekend special screenings.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>1 Active Cinema Hall with Multi-Screens</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Unlimited Ticket Sales (0% Commission)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Bank Slip Verification & Door Scanner</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Unique Cinema Code & Sublink</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenRegister('weekly')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition active:scale-95"
            >
              Get Started with Weekly →
            </button>
          </div>

          {/* Plan 2: Monthly Pro (Recommended) */}
          <div className="relative glass-panel rounded-3xl p-6 border-2 border-teal-500 bg-gradient-to-b from-teal-950/20 to-slate-900/60 flex flex-col justify-between space-y-6 shadow-2xl shadow-teal-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
              Most Popular / Recommended
            </div>

            <div className="space-y-4 pt-1">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Monthly Pro
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">MVR 499</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-teal-200/80 mt-1">
                  Best value for continuous cinemas, island town halls, and commercial screens.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-teal-500/20">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Multiple Halls & Multi-Screen Designer</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Unlimited Shows, Movies & Ticket Sales</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Attendee Mobile Numbers & Sales Reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Custom Island Hall Branding & Posters</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Priority Maldivian Support via WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenRegister('monthly')}
              className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 transition active:scale-95"
            >
              Get Started with Monthly Pro →
            </button>
          </div>

          {/* Plan 3: 1-Month Pass */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-6 transition">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                1-Month Single Pass
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">MVR 550</span>
                  <span className="text-xs text-slate-400">/ 30 days</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  One-time single month pass. No renewal lock-in, perfect for seasonal theatrical windows.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>All Monthly Features Included</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Zero Auto-Renewals or Commitments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Door Scanner & Slip Approval System</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Unique Uppercase Tenant Code</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenRegister('one_month')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition active:scale-95"
            >
              Get Started with 1-Month Pass →
            </button>
          </div>
        </div>
      </section>

      {/* Callout Banner with Sign In / Register Buttons */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-bold text-white">
              Already registered your cinema or island hall?
            </h3>
            <p className="text-xs text-slate-400">
              Sign in with your Tenant Code (e.g. OLY-01) to manage shows, screens, and check reports.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition active:scale-95"
            >
              Sign In to Portal →
            </button>
          </div>
        </div>
      </section>

      {/* -------------------- 1. LOGIN POPUP MODAL -------------------- */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close Login Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Cinema Organizer Sign In
              </h2>
              <p className="text-xs text-slate-400">
                Enter your unique Tenant Code or registered Cinema Email to access your dashboard.
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Cinema Tenant Code or Owner Email
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. OLY-01 or admin@olympus.mv"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Format: Uppercase 3-letter code + number (e.g. OLY-01)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Staff Password / PIN
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="•••••••• (Default: admin)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition active:scale-95"
              >
                Sign In to Cinema Portal →
              </button>
            </form>

            {/* Quick 1-Click Demo Logins */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-center">
                1-Click Instant Demo Accounts:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleLogin(undefined, t)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs transition group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {t.tenantCode}
                      </span>
                      <span className="font-bold text-slate-200 group-hover:text-teal-300 transition">
                        {t.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-teal-400 font-semibold">Demo Sign In →</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Switch to Registration */}
            <div className="text-center pt-2 text-xs text-slate-400">
              <span>Need a cinema account? </span>
              <button
                onClick={() => {
                  setIsLoginModalOpen(false);
                  handleOpenRegister('monthly');
                }}
                className="text-teal-400 hover:underline font-bold"
              >
                Register Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 2. REGISTRATION REQUEST MODAL -------------------- */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close Registration Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success screen if request submitted via App */}
            {registrationSubmitted ? (
              <div className="text-center space-y-4 py-4 animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Application Received!</h3>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <p>
                    Your Cinema Request has been submitted to the Super Admin queue.
                  </p>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <span className="text-slate-400">Assigned Tenant Code:</span>
                    <span className="px-2.5 py-1 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm">
                      {registrationSubmitted.tenantCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Plan: <strong className="text-white uppercase">{registrationSubmitted.subscriptionPlan}</strong> • Payment:{' '}
                    <strong className="text-white uppercase">{registrationSubmitted.paymentMethod.replace('_', ' ')}</strong>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleOpenWhatsApp}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Confirm via WhatsApp (+960 777-1234)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsRegisterModalOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Join as Cinema / Island Hall Organizer
                  </h2>
                  <p className="text-xs text-slate-400">
                    Submit via App, WhatsApp, or Telegram with your payment method of choice.
                  </p>
                </div>

                <form onSubmit={handleSubmitAppRequest} className="space-y-4">
                  {/* Plan Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Select Subscription Plan (Zero Commission)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForRegister('weekly')}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          selectedPlanForRegister === 'weekly'
                            ? 'bg-teal-500/20 border-teal-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[11px]">Weekly</div>
                        <div className="text-xs font-extrabold text-teal-300">MVR 149</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlanForRegister('monthly')}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          selectedPlanForRegister === 'monthly'
                            ? 'bg-teal-500/20 border-teal-500 text-white font-bold ring-1 ring-teal-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[11px]">Monthly</div>
                        <div className="text-xs font-extrabold text-teal-300">MVR 499</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlanForRegister('one_month')}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          selectedPlanForRegister === 'one_month'
                            ? 'bg-teal-500/20 border-teal-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[11px]">1-Month</div>
                        <div className="text-xs font-extrabold text-amber-300">MVR 550</div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method of Choice */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Payment Method of Choice
                    </label>
                    <select
                      value={chosenPaymentMethod}
                      onChange={(e: any) => setChosenPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    >
                      <option value="bml_transfer">Bank of Maldives (BML) Direct Account Transfer</option>
                      <option value="bml_gateway">BML Payment Gateway (Debit / Credit Card)</option>
                      <option value="mfaisaa">Dhiraagu m-Faisaa Mobile Pay</option>
                      <option value="cash">Cash Payment at Office Counter</option>
                    </select>
                  </div>

                  {/* Cinema Name & Island */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Cinema / Hall Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={cinemaName}
                        onChange={(e) => setCinemaName(e.target.value)}
                        placeholder="e.g. Dhuvaafaru Cinema"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Island & Atoll
                      </label>
                      <input
                        type="text"
                        value={island}
                        onChange={(e) => setIsland(e.target.value)}
                        placeholder="e.g. R. Dhuvaafaru"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Manager Name"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Maldivian Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="e.g. 7771234"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  {/* Submission Action Buttons (3 Channels) */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Request via App (Instant Tenant Code)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Via WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenTelegram}
                        className="py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                      >
                        <Send className="w-4 h-4" />
                        <span>Via Telegram</span>
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------- 3. 3-DAY FREE TRIAL MODAL (FREE USER) -------------------- */}
      {isFreeTrialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsFreeTrialModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close Free Trial Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                <Sparkles className="w-6 h-6 fill-slate-950" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Start Your 3-Day Free Trial
              </h2>
              <p className="text-xs text-slate-400">
                Experience full Maldivian movie ticketing, door scanning, and seat reservation maps. No credit card required.
              </p>
            </div>

            {/* Free Tier Limitations Notice */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Free Trial Features & Limitations:</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 pl-5 list-disc leading-relaxed">
                <li>
                  <strong className="text-white">Random Subdomain Only:</strong> Free accounts are assigned a system-generated random domain (e.g. <span className="font-mono text-amber-300">hall-XXX.tickets.mv</span>). Custom branded subdomains require a Paid Plan.
                </li>
                <li>
                  <strong className="text-white">1 Hall & 1 Screen Limit:</strong> Setup 1 cinema hall and 1 screen. Multi-screen setups (Screen 1, 2, 3 in shared halls) are available on Paid Plans.
                </li>
                <li>
                  <strong className="text-white">Full Access to 100 Seats:</strong> Free tier includes full interactive seat layout for up to 100 seats. Unlimited capacity and multiple screens are unlocked on Paid Plans.
                </li>
                <li>
                  <strong className="text-white">Standard Bank Slip Uploads:</strong> Payment gateway and custom bank logos are paid features.
                </li>
                <li>
                  <strong className="text-white">3 Days Full Sandbox:</strong> Upgrade anytime from MVR 149 with zero long-term contracts.
                </li>
              </ul>
            </div>

            {/* Form Error */}
            {trialFormError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{trialFormError}</span>
              </div>
            )}

            {/* Free Trial Setup Form */}
            <form onSubmit={handleCreateFreeTrial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Cinema / Hall Name *
                </label>
                <input
                  type="text"
                  required
                  value={trialCinemaName}
                  onChange={(e) => setTrialCinemaName(e.target.value)}
                  placeholder="e.g. Dhidhdhoo Island Hall or Cinema Central"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Island *
                  </label>
                  <input
                    type="text"
                    required
                    value={trialIsland}
                    onChange={(e) => setTrialIsland(e.target.value)}
                    placeholder="e.g. Dhidhdhoo or Malé"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Atoll
                  </label>
                  <input
                    type="text"
                    value={trialAtoll}
                    onChange={(e) => setTrialAtoll(e.target.value)}
                    placeholder="e.g. Haa Alif (HA)"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Organizer Name
                  </label>
                  <input
                    type="text"
                    value={trialOwnerName}
                    onChange={(e) => setTrialOwnerName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Maldivian Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={trialOwnerPhone}
                    onChange={(e) => setTrialOwnerPhone(e.target.value)}
                    placeholder="e.g. 7771234"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={trialOwnerEmail}
                  onChange={(e) => setTrialOwnerEmail(e.target.value)}
                  placeholder="e.g. cinema@tickets.mv"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-xl shadow-teal-500/25 transition active:scale-95 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Activate Free Trial & Enter Portal →</span>
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Random subdomain and initial Hall 1 / Screen 1 will be automatically seeded for your account.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
