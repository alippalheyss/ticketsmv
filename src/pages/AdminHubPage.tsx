import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, QrCode, Lock, ChevronRight, Sparkles, 
  Film, LogOut, CheckCircle2, AlertCircle, KeyRound, ArrowRight,
  ShieldCheck, Zap, Users, Smartphone, CreditCard, Clock,
  MapPin, Check, X, Phone, Mail, MessageCircle, Send, Plus
} from 'lucide-react';
import { cinemaStore } from '../services/store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Tenant, TenantRegistrationRequest, Hall, Screen } from '../types';
import { MALDIVES_ATOLLS, getIslandsByAtoll } from '../data/maldivesLocations';

export const AdminHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentSessionTenant, setCurrentSessionTenant] = useState<Tenant | null>(null);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isFreeTrialModalOpen, setIsFreeTrialModalOpen] = useState(false);
  const [selectedPlanForRegister, setSelectedPlanForRegister] = useState<'weekly' | 'monthly' | 'yearly' | 'one_month'>('monthly');

  // Free trial form state (free user with limitations + password credentials)
  const [trialCinemaName, setTrialCinemaName] = useState('');
  const [trialAtoll, setTrialAtoll] = useState('Kaafu (K)');
  const [trialIsland, setTrialIsland] = useState('Malé City');
  const [trialOwnerName, setTrialOwnerName] = useState('');
  const [trialOwnerPhone, setTrialOwnerPhone] = useState('+960 ');
  const [trialOwnerEmail, setTrialOwnerEmail] = useState('');
  const [trialPassword, setTrialPassword] = useState('');
  const [trialConfirmPassword, setTrialConfirmPassword] = useState('');
  const [trialFormError, setTrialFormError] = useState('');
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register request form state
  const [cinemaName, setCinemaName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('+960 ');
  const [island, setIsland] = useState('Malé City');
  const [atoll, setAtoll] = useState('Kaafu (K)');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSlipUrl, setRegSlipUrl] = useState('');
  const [regFormError, setRegFormError] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [chosenPaymentMethod, setChosenPaymentMethod] = useState<'bml_transfer'>('bml_transfer');
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

  const handleLogin = async (e?: React.FormEvent, customTenant?: Tenant) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (customTenant) {
      sessionStorage.setItem('mv_tenant_auth', JSON.stringify(customTenant));
      setCurrentSessionTenant(customTenant);
      setIsLoginModalOpen(false);
      navigate('/tenant-admin');
      return;
    }

    const query = loginIdentifier.trim().toLowerCase();
    if (!query) {
      setLoginError('Please enter your Cinema Code or Email Address');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your account password');
      return;
    }

    let authPassed = false;
    if (isSupabaseConfigured() && query.includes('@')) {
      try {
        const { data: sData, error: sErr } = await supabase.auth.signInWithPassword({
          email: query,
          password: loginPassword
        });
        if (!sErr && sData.user) {
          authPassed = true;
        }
      } catch (err) {
        console.warn('Supabase auth sign in error:', err);
      }
    }

    const found = tenants.find(
      (t) =>
        t.tenantCode?.toLowerCase() === query ||
        t.ownerEmail.toLowerCase() === query ||
        t.slug.toLowerCase() === query
    );

    if (!found) {
      setLoginError(`No cinema organizer found for "${loginIdentifier}". Check your email or register below.`);
      return;
    }

    if (!authPassed && found.passwordHash && found.passwordHash !== loginPassword) {
      setLoginError('Incorrect password. Please verify your password and try again.');
      return;
    }

    sessionStorage.setItem('mv_tenant_auth', JSON.stringify(found));
    setCurrentSessionTenant(found);
    setIsLoginModalOpen(false);
    navigate('/tenant-admin');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mv_tenant_auth');
    setCurrentSessionTenant(null);
    setLoginIdentifier('');
    setLoginPassword('');
  };

  const handleCreateFreeTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrialFormError('');

    if (!trialCinemaName.trim()) {
      setTrialFormError('Please enter your Cinema / Hall name.');
      return;
    }

    if (!trialIsland.trim()) {
      setTrialFormError('Please select your island from the dropdown.');
      return;
    }

    if (!trialOwnerPhone.trim() || trialOwnerPhone.trim() === '+960') {
      setTrialFormError('Please enter a valid Maldivian contact phone number.');
      return;
    }

    if (!trialOwnerEmail.trim() || !trialOwnerEmail.includes('@') || !trialOwnerEmail.includes('.')) {
      setTrialFormError('Please enter a valid email address for your organizer account login.');
      return;
    }

    if (!trialPassword || trialPassword.length < 6) {
      setTrialFormError('Password must be at least 6 characters long.');
      return;
    }

    if (trialPassword !== trialConfirmPassword) {
      setTrialFormError('Passwords do not match. Please re-type your password correctly.');
      return;
    }

    setIsSubmittingTrial(true);

    // If Supabase Auth is configured, register the user account in Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error: sAuthErr } = await supabase.auth.signUp({
          email: trialOwnerEmail.trim().toLowerCase(),
          password: trialPassword
        });
        if (sAuthErr && !sAuthErr.message.toLowerCase().includes('already registered')) {
          console.warn('Supabase auth notice:', sAuthErr.message);
        }
      } catch (err) {
        console.warn('Supabase auth signup error:', err);
      }
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
      ownerEmail: trialOwnerEmail.trim().toLowerCase(),
      passwordHash: trialPassword,
      branding: {
        logoUrl: '',
        bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
        primaryColor: '#0d9488',
        contactPhone: trialOwnerPhone.trim(),
        contactViber: trialOwnerPhone.trim(),
        island: trialIsland.trim(),
        atoll: trialAtoll.trim(),
        terms: '3-Day Free Trial Account (Limited to 1 Hall, 1 Screen, up to 100 seats). Upgrade anytime with zero lock-in.',
        taglineEn: 'Island Cinema (Free Trial)',
        taglineDv: 'ރަށު ސިނަމާ (ޓްރަޔަލް)'
      }
    };

    // Auto-seed initial 1 Hall and 1 Screen for free trial user with 100 seats
    const newHall: Hall = {
      id: `hall-${Date.now()}`,
      tenantId: newTenantId,
      name: `${trialCinemaName.trim()} Main Hall`,
      island: trialIsland.trim(),
      atoll: trialAtoll.trim(),
      address: `${trialIsland.trim()}, Maldives`,
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
    setIsSubmittingTrial(false);
    navigate('/tenant-admin');
  };

  const handleOpenRegister = (plan: 'weekly' | 'monthly' | 'yearly' | 'one_month' = 'monthly') => {
    setSelectedPlanForRegister(plan);
    setRegistrationSubmitted(null);
    setRegFormError('');
    setRegSlipUrl('');
    setRegPassword('');
    setRegConfirmPassword('');
    setIsRegisterModalOpen(true);
  };

  const handleSlipUploadForReg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegSlipUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAppRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegFormError('');

    if (!cinemaName.trim() || !ownerPhone.trim() || !ownerEmail.trim()) {
      setRegFormError('Please enter Cinema Name, Phone, and Email Address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setRegFormError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegFormError('Passwords do not match.');
      return;
    }

    if (!regSlipUrl) {
      setRegFormError('Please attach your BML transfer slip receipt as proof of payment.');
      return;
    }

    setIsSubmittingReg(true);
    try {
      // Optional: register in Supabase Auth if configured
      if (isSupabaseConfigured() && ownerEmail.includes('@')) {
        try {
          await supabase.auth.signUp({
            email: ownerEmail.trim().toLowerCase(),
            password: regPassword
          });
        } catch (err) {
          console.warn('Supabase auth signup for organizer:', err);
        }
      }

      const prefix = cinemaName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'CIN';
      const genCode = `${prefix}-${Math.floor(10 + Math.random() * 89)}`;
      const price = selectedPlanForRegister === 'weekly' ? 149 : (selectedPlanForRegister === 'yearly' || selectedPlanForRegister === 'one_month') ? 499 : 249;

      const req = cinemaStore.createTenantRequest({
        cinemaName: cinemaName.trim(),
        tenantCode: genCode,
        contactPerson: ownerName.trim() || 'Manager',
        contactEmail: ownerEmail.trim().toLowerCase(),
        contactPhone: ownerPhone.trim(),
        island: island || 'Malé City',
        atoll: atoll || 'Kaafu (K)',
        passwordHash: regPassword,
        subscriptionPlan: (selectedPlanForRegister === 'one_month' ? 'yearly' : selectedPlanForRegister) as any,
        subscriptionPriceMvr: price,
        paymentMethod: 'bml_transfer',
        paymentSlipUrl: regSlipUrl,
        channel: 'in_app',
        notes: `New organizer subscription for ${selectedPlanForRegister.toUpperCase()} (MVR ${price}) with BML transfer slip attached.`
      });

      setRegistrationSubmitted(req);
    } catch (err: any) {
      setRegFormError(err.message || 'Failed to submit registration request.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello CinemaMV.online! I want to register as a Cinema Organizer.\n\n` +
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
    window.open('https://t.me/CinemaMVAdmin', '_blank');
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
              Keep 100% of your ticket sales. Unlike other platforms that extract 5% to 15% cuts per ticket, CinemaMV.online operates on flat, predictable SaaS subscriptions with direct bank transfers.
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

      {/* Subscription Plans Section - 3-Day Free Trial, Weekly, Monthly, 1-Year Pass */}
      <section id="subscription-plans-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-20">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>0% Commission • Keep 100% of Your Box Office</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Transparent Island SaaS Plans
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            No per-ticket fees. No hidden cuts. All ticket revenue goes directly to your BML / MIB bank account.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Plan 0: 3-Day Free Trial */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 hover:border-slate-700 bg-slate-900/60 flex flex-col justify-between space-y-6 transition">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 inline-block">
                3-Day Free Sandbox
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">MVR 0</span>
                  <span className="text-xs text-slate-400">/ 3 days</span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md inline-block">
                  Risk-Free • Test Everything
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Full sandbox to test hall seat maps, mobile QR scanning, and customer booking flows.
                </p>
              </div>

              {/* Available & Limitations */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                  Included In Free Trial:
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>1 Cinema Hall & Screen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Up to 100 Visual Seats</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Gate QR Door Scanner App</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>BML Bank Transfer Verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Assigned Random Subdomain</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                setTrialFormError('');
                setIsFreeTrialModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              Activate Free Trial →
            </button>
          </div>

          {/* Plan 1: Weekly */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-6 transition">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Festival & Weekend Pass
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">MVR 149</span>
                  <span className="text-xs text-slate-400">/ 7 days</span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md inline-block">
                  Flexible • No Contract
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Tailored for island Eid festivals, film premieres, school holiday roadshows, or single screenings.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                  Weekly Plan Perks:
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Unlimited Ticket Sales (0% Commission)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>1 Active Hall with Multi-Screens</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Mobile QR Gate Ticket Scanner</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Unique Cinema Code & Direct Link</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Instant WhatsApp Ticket Passes</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleOpenRegister('weekly')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition active:scale-95"
            >
              Get Started with Weekly →
            </button>
          </div>

          {/* Plan 2: Monthly Pro */}
          <div className="relative glass-panel rounded-3xl p-6 border-2 border-teal-500 bg-gradient-to-b from-teal-950/30 via-slate-900/80 to-slate-900 flex flex-col justify-between space-y-6 shadow-2xl shadow-teal-500/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
              Most Popular • Best Seller
            </div>

            <div className="space-y-4 pt-1">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Monthly Pro Plan
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">MVR 249</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block">
                  Only ~MVR 8.30/day • Pays for itself in 2 tickets!
                </div>
                <p className="text-xs text-teal-200/80 mt-2">
                  Everything you need for ongoing island theaters, town youth halls, and regular movie nights.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-teal-500/20">
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                  All Pro Cinema Features:
                </span>
                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>100% Revenue Kept:</strong> Direct to your BML/MIB</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>Custom Subdomain:</strong> you.cinemamv.online</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>Multi-Screens:</strong> Screen 1, 2, 3 & seat designer</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>Attendee Export:</strong> Customer Maldivian mobiles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>Unlimited:</strong> Movies, shows, and door tickets</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleOpenRegister('monthly')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 transition active:scale-95"
            >
              Get Started with Monthly (MVR 249) →
            </button>
          </div>

          {/* Plan 3: 1-Year Annual Pass (Super Value) */}
          <div className="relative glass-panel rounded-3xl p-6 border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/25 via-slate-900/80 to-slate-900 flex flex-col justify-between space-y-6 shadow-2xl shadow-amber-500/15">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
              🔥 Best Value • Save 83%
            </div>

            <div className="space-y-4 pt-1">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                1-Year VIP Cinema Pass
              </span>
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">MVR 499</span>
                  <span className="text-xs text-slate-400">/ 365 days</span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                  Only MVR 41.50/mo • Save 83% Over Monthly!
                </div>
                <p className="text-xs text-amber-200/80 mt-2">
                  The ultimate 12-month pass. Unlocks full cinema power for an entire year for less than the price of 4 movie tickets.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-amber-500/20">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  VIP Annual Privileges:
                </span>
                <ul className="space-y-2 text-xs text-slate-200">
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>Full 365 Days:</strong> Uninterrupted cinema hosting</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>All Pro & Multi-Screen:</strong> VIP & Standard seats</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>Priority Support:</strong> Direct Maldivian WhatsApp</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>Customer CRM:</strong> Mobile numbers & show broadcasts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>Zero Commissions:</strong> 100% box office profit</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleOpenRegister('yearly')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              Claim 1-Year Pass (MVR 499) →
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
                    placeholder="e.g. OLY-01 or alippalheys@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Staff Password / PIN
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
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
                        <div className="text-[11px]">Monthly Pro</div>
                        <div className="text-xs font-extrabold text-teal-300">MVR 249</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlanForRegister('yearly')}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          selectedPlanForRegister === 'yearly' || selectedPlanForRegister === 'one_month'
                            ? 'bg-teal-500/20 border-teal-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[11px]">1-Year Pass</div>
                        <div className="text-xs font-extrabold text-amber-300">MVR 499</div>
                      </button>
                    </div>
                  </div>

                  {/* Live CinemaMV Platform Bank Details for Subscription Transfer */}
                  {(() => {
                    const platBank = cinemaStore.getPlatformBankDetails();
                    const targetPrice = selectedPlanForRegister === 'weekly' ? 149 : (selectedPlanForRegister === 'yearly' || selectedPlanForRegister === 'one_month') ? 499 : 249;
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

                  {/* Cinema Name & Location */}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Atoll *
                      </label>
                      <select
                        value={atoll}
                        onChange={(e) => {
                          const newAtoll = e.target.value;
                          setAtoll(newAtoll);
                          const isles = getIslandsByAtoll(newAtoll);
                          setIsland(isles[0] || '');
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      >
                        {MALDIVES_ATOLLS.map((a) => (
                          <option key={a.code} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Island *
                      </label>
                      <select
                        value={island}
                        onChange={(e) => setIsland(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      >
                        {getIslandsByAtoll(atoll).map((isle) => (
                          <option key={isle} value={isle}>
                            {isle}
                          </option>
                        ))}
                      </select>
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

                  {/* Email Address & Password for Login */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Account Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="e.g. manager@cinemamv.online"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Account Password * <span className="text-slate-400 font-normal">(min 6 chars)</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create password"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  {/* Mandatory Transfer Slip Receipt Upload */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Upload BML Transfer Slip Receipt <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleSlipUploadForReg}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500 file:text-slate-950 hover:file:bg-teal-400 cursor-pointer"
                    />
                    {regSlipUrl && (
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
                        <img
                          src={regSlipUrl}
                          alt="Receipt preview"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                        />
                        <span className="text-xs text-emerald-400 font-medium">✓ Receipt attached successfully</span>
                      </div>
                    )}
                  </div>

                  {regFormError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regFormError}</span>
                    </div>
                  )}

                  {/* Submission Action Buttons (3 Channels) */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmittingReg}
                      className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingReg ? 'Submitting Request...' : 'Submit Request via App (Instant Tenant Code)'}</span>
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
                  <strong className="text-white">Random Subdomain Only:</strong> Free accounts are assigned a system-generated random domain (e.g. <span className="font-mono text-amber-300">hall-XXX.cinemamv.online</span>). Custom branded subdomains require a Paid Plan.
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
                    Atoll *
                  </label>
                  <select
                    value={trialAtoll}
                    onChange={(e) => {
                      const newAtoll = e.target.value;
                      setTrialAtoll(newAtoll);
                      const isles = getIslandsByAtoll(newAtoll);
                      setTrialIsland(isles[0] || '');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  >
                    {MALDIVES_ATOLLS.map((a) => (
                      <option key={a.code} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Island *
                  </label>
                  <select
                    value={trialIsland}
                    onChange={(e) => setTrialIsland(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  >
                    {getIslandsByAtoll(trialAtoll).map((isle) => (
                      <option key={isle} value={isle}>
                        {isle}
                      </option>
                    ))}
                  </select>
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
                    placeholder="Your Full Name"
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
                    placeholder="+960 7771234"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Organizer Email Address (For Login) *
                </label>
                <input
                  type="email"
                  required
                  value={trialOwnerEmail}
                  onChange={(e) => setTrialOwnerEmail(e.target.value)}
                  placeholder="e.g. cinema@cinemamv.online"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Account Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={trialPassword}
                    onChange={(e) => setTrialPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={trialConfirmPassword}
                    onChange={(e) => setTrialConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTrial}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-xl shadow-teal-500/25 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>{isSubmittingTrial ? 'Registering Account...' : 'Register Account & Enter Portal →'}</span>
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
