import React, { useState, useEffect } from 'react';
import { cinemaStore } from '../services/store';
import { Tenant, SystemLog, Booking, Hall, SubscriptionModel, TenantRegistrationRequest, PlatformBankDetails } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  Shield, TrendingUp, Users, Ticket, Building, Activity, 
  DollarSign, Mail, Search, RefreshCw, Calendar, Sparkles, 
  CheckCircle2, Lock, LogOut, KeyRound, AlertCircle, Phone, MessageCircle, Send, Check, Trash2,
  CreditCard, Save, Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SuperAdminPage: React.FC = () => {
  const { formatCurrency } = useLanguage();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('mv_superadmin_auth') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantRequests, setTenantRequests] = useState<TenantRegistrationRequest[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [platformBank, setPlatformBank] = useState<PlatformBankDetails>(() => cinemaStore.getPlatformBankDetails());
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankSavedMessage, setBankSavedMessage] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'payment' | 'tenant' | 'email' | 'checkin'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setTenants(cinemaStore.getTenants());
    setTenantRequests(cinemaStore.getTenantRequests());
    setSystemLogs(cinemaStore.getSystemLogs());
    setBookings(cinemaStore.getBookings());
    setHalls(cinemaStore.getHalls());
    setPlatformBank(cinemaStore.getPlatformBankDetails());
  };

  useEffect(() => {
    loadData();
    const unsub = cinemaStore.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const email = loginEmail.trim().toLowerCase();
    const pass = loginPass.trim();

    if (!email || !pass) {
      setAuthError('Please enter your Super Admin email and password.');
      return;
    }

    if (email !== 'alippalhey@gmail.com') {
      setAuthError('Access restricted. Only alippalhey@gmail.com has Super Admin privileges.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass
        });

        if (error || !data.user) {
          setAuthError(error?.message || 'Invalid Super Admin credentials.');
          setIsSubmitting(false);
          return;
        }
      }

      sessionStorage.setItem('mv_superadmin_auth', 'true');
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('mv_superadmin_auth');
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPass('');
  };

  // IF NOT AUTHENTICATED: DISPLAY SUPER ADMIN LOGIN GATE FIRST
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Platform Owner & Super Admin Login
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Restricted master administration gate for CinemaMV.online. Manage tenant subscriptions, review requests, and platform logs.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="alippalhey@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying Super Admin...' : 'Access Super Admin Dashboard →'}
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

  // Platform Analytics Calculations
  const totalSubscriptionRevenueMVR = tenants
    .filter((t) => t.status === 'active' && t.subscriptionModel !== 'free_trial')
    .reduce((sum, t) => sum + (t.subscriptionPriceMvr || 249), 0);

  const totalTicketsBooked = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.seats.length, 0);

  const activeTenantsCount = tenants.filter((t) => t.status === 'active').length;
  const activeHallsCount = halls.length;

  // Change Subscription Model (Weekly, Monthly, or 1-Year Pass)
  const handleSetSubscription = (tenant: Tenant, model: SubscriptionModel) => {
    let price = 249;
    if (model === 'weekly') price = 149;
    if (model === 'monthly') price = 249;
    if (model === 'yearly' || model === 'one_month') price = 499;
    if (model === 'free_trial') price = 0;

    cinemaStore.updateTenantSubscription(tenant.id, model, price);
    loadData();
  };

  // Toggle Status (Active vs Suspended)
  const handleToggleStatus = (tenant: Tenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    cinemaStore.updateTenantStatus(tenant.id, nextStatus);
    loadData();
  };

  // Permanently Delete Cinema
  const handleDeleteTenant = (tenant: Tenant) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete cinema "${tenant.name}" (${tenant.tenantCode})?\n\nThis will remove all halls, screens, showtimes, and public routes for this cinema. This action cannot be undone.`
    );
    if (!confirmed) return;
    cinemaStore.deleteTenant(tenant.id);
    loadData();
  };

  // Approve Tenant Onboarding Request
  const handleApproveRequest = (reqId: string) => {
    const newTenant = cinemaStore.approveTenantRequest(reqId);
    if (newTenant) {
      alert(`Tenant "${newTenant.name}" approved! Code: ${newTenant.tenantCode}. Public portal: /t/${newTenant.slug}`);
      loadData();
    }
  };

  // Reject Tenant Request
  const handleRejectRequest = (reqId: string) => {
    cinemaStore.rejectTenantRequest(reqId);
    loadData();
  };

  // Filtered system logs
  const filteredLogs = systemLogs.filter((log) => {
    if (logFilter !== 'all' && log.type !== logFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.message.toLowerCase().includes(term) ||
        (log.details && log.details.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleBankQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlatformBank((prev) => ({ ...prev, qrImageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePlatformBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformBank.bankName.trim() || !platformBank.accountNumber.trim()) {
      alert('Please enter Bank Name and Account Number.');
      return;
    }
    setIsSavingBank(true);
    cinemaStore.savePlatformBankDetails(platformBank);
    setIsSavingBank(false);
    setBankSavedMessage(true);
    setTimeout(() => setBankSavedMessage(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Minimal Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Super Admin</h1>
            <p className="text-[11px] text-slate-400">CinemaMV.online Network Control Hub</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
            title="Sync Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
            title="Sign out of Super Admin"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Subscription Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{formatCurrency(totalSubscriptionRevenueMVR)}</p>
          <p className="text-[11px] text-emerald-400 font-medium">Weekly, Monthly & 1-Year Plans (0% Ticket Fee)</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tickets Issued</span>
            <Ticket className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{totalTicketsBooked} Seats</p>
          <p className="text-[11px] text-teal-400 font-medium">100% of ticket sales go to cinema owners</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Subscribed Cinemas</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{activeTenantsCount} Active</p>
          <p className="text-[11px] text-slate-400">{tenants.filter(t => t.subscriptionModel !== 'free_trial').length} on Paid Plans</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Island Halls</span>
            <Building className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{activeHallsCount} Halls</p>
          <p className="text-[11px] text-purple-400 font-medium">Multi-screen auditoriums supported</p>
        </div>
      </div>

      {/* INCOMING TENANT ONBOARDING REQUESTS SECTION */}
      <div className="glass-panel rounded-3xl p-6 border border-teal-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>Organizer Onboarding Requests</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300">
                {tenantRequests.filter(r => r.status === 'pending').length} Pending
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and approve registration requests submitted via App, WhatsApp, or Telegram.
            </p>
          </div>
        </div>

        {tenantRequests.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No incoming organizer requests at this moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenantRequests.map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                  req.status === 'pending'
                    ? 'bg-slate-900/90 border-teal-500/40 shadow-lg'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Code: {req.tenantCode}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      req.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                      req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-rose-500/20 text-rose-300'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-2">{req.cinemaName}</h3>
                  <p className="text-xs text-slate-300 font-semibold">{req.island} • {req.atoll}</p>
                  
                  <div className="mt-2 text-xs space-y-1 text-slate-400">
                    <p>Contact: <span className="text-white font-medium">{req.contactPerson} ({req.contactPhone})</span></p>
                    <p>Email: <span className="text-white font-mono">{req.contactEmail}</span></p>
                    <p>Requested Plan: <span className="text-teal-300 font-bold">{req.subscriptionPlan.toUpperCase()} (MVR {req.subscriptionPriceMvr})</span></p>
                    <p>Payment Choice: <span className="text-cyan-300 font-bold">{req.paymentMethod.replace('_', ' ').toUpperCase()}</span></p>
                    <p>Channel: <span className="text-amber-300 font-semibold">{req.channel.toUpperCase()}</span></p>
                    {req.notes && <p className="italic text-slate-400">"{req.notes}"</p>}
                    {(req.paymentSlipUrl || (req as any).slipUrl) && (
                      <div className="pt-2">
                        <span className="text-[11px] text-slate-400 block mb-1 font-semibold">Bank Transfer Receipt Slip:</span>
                        <a href={req.paymentSlipUrl || (req as any).slipUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={req.paymentSlipUrl || (req as any).slipUrl}
                            alt="Payment Slip"
                            className="w-full max-h-36 object-contain rounded-xl border border-slate-700 bg-black/40 hover:opacity-90 transition cursor-zoom-in"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleApproveRequest(req.id)}
                      className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Activate</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-bold transition border border-slate-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CINEMAMV PLATFORM SETTINGS & CONTACT CHANNELS (SUPER ADMIN MANAGED) */}
      <div className="glass-panel rounded-3xl p-6 border border-teal-500/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>CinemaMV Platform Settings & Support Channels</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Global Configuration
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Update your Telegram, WhatsApp, Mobile phone, Support email, and Platform Bank details. Changes reflect live across the entire website and apps.
              </p>
            </div>
          </div>
          {bankSavedMessage && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center space-x-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Platform Settings Saved Live!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSavePlatformBank} className="space-y-5">
          {/* Section 1: Support & Communication Channels */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
              <span>1. Official Support & Contact Channels</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile / Phone Number *</label>
                <input
                  type="text"
                  required
                  value={platformBank.contactPhone || ''}
                  onChange={(e) => setPlatformBank({ ...platformBank, contactPhone: e.target.value })}
                  placeholder="+960 7771234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Number *</label>
                <input
                  type="text"
                  required
                  value={platformBank.contactWhatsapp || ''}
                  onChange={(e) => setPlatformBank({ ...platformBank, contactWhatsapp: e.target.value })}
                  placeholder="+960 7771234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-mono font-bold text-xs focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telegram Username / Handle *</label>
                <input
                  type="text"
                  required
                  value={platformBank.contactTelegram || ''}
                  onChange={(e) => setPlatformBank({ ...platformBank, contactTelegram: e.target.value })}
                  placeholder="@TicketsMVAdmin"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-xs focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Support Email *</label>
                <input
                  type="email"
                  required
                  value={platformBank.contactEmail || ''}
                  onChange={(e) => setPlatformBank({ ...platformBank, contactEmail: e.target.value })}
                  placeholder="alippalhey@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Platform Bank Transfer Details for SaaS Plans */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
              <span>2. Platform Bank Account (For Organizer Subscriptions & Passes)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={platformBank.bankName}
                  onChange={(e) => setPlatformBank({ ...platformBank, bankName: e.target.value })}
                  placeholder="Bank of Maldives (BML)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-400"
                />
              </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={platformBank.accountNumber}
                onChange={(e) => setPlatformBank({ ...platformBank, accountNumber: e.target.value })}
                placeholder="7701 1928 4401 001"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-teal-300 font-mono font-bold text-xs focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Holder Name *</label>
              <input
                type="text"
                required
                value={platformBank.accountName}
                onChange={(e) => setPlatformBank({ ...platformBank, accountName: e.target.value })}
                placeholder="CinemaMV Platform Pvt Ltd"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency *</label>
              <input
                type="text"
                required
                value={platformBank.currency}
                onChange={(e) => setPlatformBank({ ...platformBank, currency: e.target.value })}
                placeholder="MVR"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transfer Memo & Instructions for Organizers
              </label>
              <textarea
                rows={3}
                value={platformBank.instructions}
                onChange={(e) => setPlatformBank({ ...platformBank, instructions: e.target.value })}
                placeholder="Please include your cinema code or name in the transaction memo..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Platform BML QR Code (Optional)
              </label>
              <div className="flex items-center space-x-3">
                {platformBank.qrImageUrl ? (
                  <img
                    src={platformBank.qrImageUrl}
                    alt="Platform QR"
                    className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-[10px] text-center p-1 shrink-0">
                    No QR
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBankQrUpload}
                    className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer"
                  />
                  {platformBank.qrImageUrl && (
                    <button
                      type="button"
                      onClick={() => setPlatformBank({ ...platformBank, qrImageUrl: '' })}
                      className="text-[10px] text-rose-400 hover:underline mt-1 block"
                    >
                      Remove QR
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSavingBank}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition active:scale-95 flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingBank ? 'Saving...' : 'Save Platform Settings & Contacts'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tenant Management Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Active Tenant Cinemas & Codes</h2>
            <p className="text-xs text-slate-400">
              Each tenant has an uppercase code for easy recognition across tickets and portals.
            </p>
          </div>
        </div>

        {/* MOBILE VIEW (CARDS) - ZERO HORIZONTAL SCROLL */}
        <div className="block lg:hidden space-y-4">
          {tenants.map((tenant) => {
            const isActive = tenant.status === 'active';

            return (
              <div key={tenant.id} className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={tenant.branding.logoUrl}
                      alt={tenant.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div>
                      <h3 className="font-bold text-white text-sm">{tenant.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{tenant.ownerEmail}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {tenant.tenantCode || 'ORG'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Location:</span>
                    <span className="font-semibold text-slate-200">{tenant.branding.island}, {tenant.branding.atoll}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Portal URL:</span>
                    <a
                      href={`/t/${tenant.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-teal-400 hover:underline font-semibold"
                    >
                      /t/{tenant.slug} ↗
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Plan:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      tenant.tier === 'free' || tenant.subscriptionModel === 'free_trial'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    }`}>
                      {tenant.subscriptionModel === 'weekly' ? 'Weekly (MVR 149/wk)' :
                       tenant.subscriptionModel === 'yearly' || tenant.subscriptionModel === 'one_month' ? '1-Year Pass (MVR 499/yr)' :
                       tenant.subscriptionModel === 'monthly' ? 'Monthly (MVR 249/mo)' :
                       'Free Plan (MVR 0)'}
                    </span>
                  </div>
                  {tenant.subscriptionBillingDate && (
                    <p className="text-[10px] font-mono text-right text-slate-400">
                      {new Date(tenant.subscriptionBillingDate).getTime() < Date.now()
                        ? <span className="text-rose-400 font-bold">Expired • Fallen back to Free</span>
                        : `Expires: ${new Date(tenant.subscriptionBillingDate).toLocaleDateString()}`}
                    </p>
                  )}
                </div>

                {/* Plan switcher and actions */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">Switch Subscription:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      onClick={() => handleSetSubscription(tenant, 'free_trial')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                        tenant.subscriptionModel === 'free_trial' || tenant.tier === 'free'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-amber-300/80 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Free (0)
                    </button>
                    <button
                      onClick={() => handleSetSubscription(tenant, 'weekly')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                        tenant.subscriptionModel === 'weekly'
                          ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Weekly (149)
                    </button>
                    <button
                      onClick={() => handleSetSubscription(tenant, 'monthly')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                        tenant.subscriptionModel === 'monthly'
                          ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Monthly (249)
                    </button>
                    <button
                      onClick={() => handleSetSubscription(tenant, 'yearly')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                        tenant.subscriptionModel === 'yearly' || tenant.subscriptionModel === 'one_month'
                          ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow-sm'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      1-Year (499)
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    {tenant.tier === 'paid' && (
                      <button
                        onClick={() => {
                          cinemaStore.expireTenantNow(tenant.id);
                          loadData();
                        }}
                        className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition text-center"
                      >
                        ⚡ Expire
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(tenant)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition text-center ${
                        isActive
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isActive ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteTenant(tenant)}
                      className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition flex items-center justify-center space-x-1"
                      title="Permanently Delete Cinema"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP VIEW (TABLE) */}
        <div className="hidden lg:block glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Tenant Code</th>
                  <th className="px-5 py-4">Tenant / Cinema</th>
                  <th className="px-5 py-4">Sublink Slug</th>
                  <th className="px-5 py-4">Island & Atoll</th>
                  <th className="px-5 py-4">Current Subscription</th>
                  <th className="px-5 py-4">Change Model (Weekly / Monthly / 1-Year)</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tenants.map((tenant) => {
                  const isActive = tenant.status === 'active';

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {tenant.tenantCode || 'ORG'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={tenant.branding.logoUrl}
                            alt={tenant.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                          />
                          <div>
                            <div className="font-bold text-white text-sm">{tenant.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{tenant.ownerEmail}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono font-medium text-teal-400">
                        /t/{tenant.slug}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-200">{tenant.branding.island}</span>
                        <div className="text-[11px] text-slate-500">{tenant.branding.atoll}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                            tenant.tier === 'free' || tenant.subscriptionModel === 'free_trial'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          }`}>
                            {tenant.subscriptionModel === 'weekly' ? 'Weekly (MVR 149/wk)' :
                             tenant.subscriptionModel === 'yearly' || tenant.subscriptionModel === 'one_month' ? '1-Year Pass (MVR 499/yr)' :
                             tenant.subscriptionModel === 'monthly' ? 'Monthly (MVR 249/mo)' :
                             'Free Plan (MVR 0)'}
                          </span>

                          <div className="text-[10px] font-mono">
                            {tenant.subscriptionBillingDate ? (
                              new Date(tenant.subscriptionBillingDate).getTime() < Date.now() ? (
                                <span className="text-rose-400 font-bold">Expired • Fallen back to Free</span>
                              ) : (
                                <span className="text-slate-400">Expires: {new Date(tenant.subscriptionBillingDate).toLocaleDateString()}</span>
                              )
                            ) : (
                              <span className="text-slate-500">Free Tier</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => handleSetSubscription(tenant, 'free_trial')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              tenant.subscriptionModel === 'free_trial' || tenant.tier === 'free'
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                : 'bg-slate-800 text-amber-300/80 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                            title="Switch/Fallback to Free Plan (Restricts Pro Features)"
                          >
                            Free Plan (0)
                          </button>
                          <button
                            onClick={() => handleSetSubscription(tenant, 'weekly')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              tenant.subscriptionModel === 'weekly'
                                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            Weekly (149)
                          </button>
                          <button
                            onClick={() => handleSetSubscription(tenant, 'monthly')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              tenant.subscriptionModel === 'monthly'
                                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            Monthly (249)
                          </button>
                          <button
                            onClick={() => handleSetSubscription(tenant, 'yearly')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              tenant.subscriptionModel === 'yearly' || tenant.subscriptionModel === 'one_month'
                                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            1-Year (499)
                          </button>

                          {tenant.tier === 'paid' && (
                            <button
                              onClick={() => {
                                cinemaStore.expireTenantNow(tenant.id);
                                loadData();
                              }}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition active:scale-95"
                              title="Immediately expire subscription to test automatic fallback to Free Tier"
                            >
                              ⚡ Expire (Fallback)
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(tenant)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                            isActive
                              ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 inline-flex items-center space-x-1"
                          title="Permanently Delete Cinema"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Audit Logs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-teal-400" />
              <span>Real-Time Platform Audit Logs</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live immutable stream of ticket holds, gateway responses, and check-ins.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audit trail..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-800 p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-teal-400 font-bold uppercase">
                    [{log.type}]
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
                {log.details && (
                  <p className="text-[11px] text-slate-400 font-sans">{log.details}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap pl-3">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
