import React, { useState, useEffect } from 'react';
import { cinemaStore } from '../services/store';
import { Tenant, SystemLog, Booking, Hall, SubscriptionModel, TenantRegistrationRequest } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  Shield, TrendingUp, Users, Ticket, Building, Activity, 
  DollarSign, Mail, Search, RefreshCw, Calendar, Sparkles, 
  CheckCircle2, Lock, LogOut, KeyRound, AlertCircle, Phone, MessageCircle, Send, Check 
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const [logFilter, setLogFilter] = useState<'all' | 'payment' | 'tenant' | 'email' | 'checkin'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setTenants(cinemaStore.getTenants());
    setTenantRequests(cinemaStore.getTenantRequests());
    setSystemLogs(cinemaStore.getSystemLogs());
    setBookings(cinemaStore.getBookings());
    setHalls(cinemaStore.getHalls());
  };

  useEffect(() => {
    loadData();
    const unsub = cinemaStore.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleAdminLogin = (e?: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    setAuthError('');

    if (force || (loginEmail.trim().toLowerCase() === 'superadmin@tickets.mv' && loginPass.trim() === 'admin123')) {
      sessionStorage.setItem('mv_superadmin_auth', 'true');
      setIsAuthenticated(true);
    } else if (loginEmail.trim() && loginPass.trim()) {
      // Allow flexible demo pass
      sessionStorage.setItem('mv_superadmin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      setAuthError('Please enter valid Super Admin credentials. Hint: superadmin@tickets.mv / admin123');
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
            Restricted master administration gate for Tickets.mv. Manage tenant subscriptions, review requests, and platform logs.
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
                placeholder="superadmin@tickets.mv"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Master Passkey
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="•••••••• (Default: admin123)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition active:scale-95"
          >
            Access Super Admin Dashboard →
          </button>

          {/* Quick Demo Access Button */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => handleAdminLogin(undefined, true)}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline"
            >
              ⚡ 1-Click Quick Demo Login as Super Admin
            </button>
          </div>
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
    .reduce((sum, t) => sum + (t.subscriptionPriceMvr || 499), 0);

  const totalTicketsBooked = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.seats.length, 0);

  const activeTenantsCount = tenants.filter((t) => t.status === 'active').length;
  const activeHallsCount = halls.length;

  // Change Subscription Model (Weekly, Monthly, or One Month Only)
  const handleSetSubscription = (tenant: Tenant, model: SubscriptionModel) => {
    let price = 499;
    if (model === 'weekly') price = 149;
    if (model === 'monthly') price = 499;
    if (model === 'one_month') price = 550;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white">Super Admin Control Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Weekly • Monthly • One-Month Subscriptions
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage cinema subscriptions: Weekly, Monthly, or One Month Only. Zero commission fees are charged to admins or tenants.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
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
          <p className="text-[11px] text-emerald-400 font-medium">Weekly, Monthly & 1-Month Plans (0% Ticket Fee)</p>
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

        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Tenant Code</th>
                  <th className="px-5 py-4">Tenant / Cinema</th>
                  <th className="px-5 py-4">Sublink Slug</th>
                  <th className="px-5 py-4">Island & Atoll</th>
                  <th className="px-5 py-4">Current Subscription</th>
                  <th className="px-5 py-4">Change Model (Weekly / Monthly / 1-Month)</th>
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
                             tenant.subscriptionModel === 'one_month' ? 'One Month Only (MVR 550)' :
                             tenant.subscriptionModel === 'monthly' ? 'Monthly (MVR 499/mo)' :
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
                            Monthly (499)
                          </button>
                          <button
                            onClick={() => handleSetSubscription(tenant, 'one_month')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              tenant.subscriptionModel === 'one_month'
                                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            1-Month (550)
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
                              ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10'
                              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {isActive ? 'Suspend' : 'Activate'}
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
