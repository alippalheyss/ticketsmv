import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { cinemaStore } from '../services/store';
import { Booking, Tenant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  QrCode, Camera, CheckCircle2, AlertTriangle, XCircle, Search, 
  Clock, ShieldCheck, MapPin, History, Lock, LogOut, KeyRound, 
  Building2, Sparkles, AlertCircle 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const ValidatorPage: React.FC = () => {
  const { t } = useLanguage();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem('mv_validator_auth') || sessionStorage.getItem('mv_tenant_auth'));
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    try {
      const saved = sessionStorage.getItem('mv_validator_auth') || sessionStorage.getItem('mv_tenant_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const list = cinemaStore.getTenants();
        const found = list.find((x) => x.id === parsed.id || x.ownerEmail === parsed.ownerEmail);
        if (found && found.status !== 'suspended') return found;
      }
    } catch {}
    return null;
  });

  // Login form state
  const [loginCode, setLoginCode] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Scanner state
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scan result state
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    alreadyCheckedIn: boolean;
    booking?: Booking;
    message: string;
    checkedInAt?: string;
  } | null>(null);

  const [scanHistory, setScanHistory] = useState<Array<{
    ref: string;
    guest: string;
    time: string;
    valid: boolean;
  }>>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Sync tenant changes from store
  useEffect(() => {
    const unsub = cinemaStore.subscribe(() => {
      if (currentTenant) {
        const fresh = cinemaStore.getTenants().find((t) => t.id === currentTenant.id);
        if (fresh) setCurrentTenant(fresh);
      }
    });
    return () => unsub();
  }, [currentTenant?.id]);

  // Handle Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const query = loginCode.trim().toLowerCase();
    if (!query) {
      setLoginError('Please enter your Cinema Code or Organizer Email');
      return;
    }

    if (!loginPass.trim()) {
      setLoginError('Please enter your password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const allTenantsList = cinemaStore.getTenants();
      const found = allTenantsList.find(
        (t) =>
          t.tenantCode?.toLowerCase() === query ||
          t.ownerEmail.toLowerCase() === query ||
          t.slug.toLowerCase() === query
      );

      if (!found) {
        setLoginError(`No registered cinema found for "${loginCode}". Check your cinema code or contact Super Admin.`);
        setIsLoggingIn(false);
        return;
      }

      if (found.status === 'suspended') {
        setLoginError('This cinema account has been suspended. Please contact the administrator.');
        setIsLoggingIn(false);
        return;
      }

      // Password verification
      let passOk = false;
      if (isSupabaseConfigured() && query.includes('@')) {
        const { error } = await supabase.auth.signInWithPassword({
          email: query,
          password: loginPass
        });
        if (!error) {
          passOk = true;
        }
      }

      if (!passOk) {
        if (found.passwordHash) {
          if (found.passwordHash === loginPass) {
            passOk = true;
          }
        } else {
          // If no password set yet for this cinema, accept password and save it
          found.passwordHash = loginPass;
          cinemaStore.saveTenant(found);
          passOk = true;
        }
      }

      if (!passOk) {
        setLoginError('Incorrect password. Please verify your credentials.');
        setIsLoggingIn(false);
        return;
      }

      sessionStorage.setItem('mv_validator_auth', JSON.stringify(found));
      setCurrentTenant(found);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffLogout = () => {
    sessionStorage.removeItem('mv_validator_auth');
    sessionStorage.removeItem('mv_tenant_auth');
    setIsAuthenticated(false);
    setCurrentTenant(null);
    setValidationResult(null);
    if (isScanning && scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      setIsScanning(false);
    }
  };

  // Web Audio synth for instant door feedback beep
  const playBeep = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {}
  };

  const handleValidation = (code: string) => {
    if (!code.trim() || !currentTenant) return;
    // Strictly validate against the currently authenticated cinema to prevent cross-venue validation
    const res = cinemaStore.validateTicket(code.trim(), currentTenant.id);
    setValidationResult(res);
    playBeep(res.valid);

    if (res.booking) {
      setScanHistory((prev) => [
        {
          ref: res.booking!.bookingRef,
          guest: res.booking!.guestName,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          valid: res.valid
        },
        ...prev.slice(0, 9)
      ]);
    }
  };

  // Start Camera QR Scanner
  const startCameraScanner = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-container');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleValidation(decodedText);
          // Pause briefly to avoid immediate repeated scans
          if (scannerRef.current) {
            scannerRef.current.pause(true);
            setTimeout(() => {
              try {
                scannerRef.current?.resume();
              } catch {}
            }, 2500);
          }
        },
        () => {
          // ignore frame decode misses
        }
      );
    } catch (err: any) {
      console.error('Camera init error:', err);
      setCameraError('Camera access failed or was denied. You can still validate tickets via booking reference ID below.');
      setIsScanning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // 1. IF NOT AUTHENTICATED: SHOW DOOR STAFF LOGIN SCREEN
  if (!isAuthenticated || !currentTenant) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Icon and Title */}
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-block mb-1.5">
                Staff Authentication Required
              </span>
              <h1 className="text-2xl font-bold text-white">Door Staff QR Validator</h1>
              <p className="text-xs text-slate-400 mt-1">
                ދޮރުވާނު އަދި ގޭޓްކީޕަރ ލޮގިން: ވަދެވަޑައިގަތުމަށް ސިނަމާ ކޯޑާއި ޕާސްވޯޑް ޖައްސަވާ
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Cinema Code or Organizer Email
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  placeholder="e.g. CIN-MLE-01 or organizer@cinema.mv"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Staff / Organizer Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
            >
              {isLoggingIn ? (
                <span>Authenticating Door Staff...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Gate Scanner</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Only authorized cinema gatekeepers and managers may validate tickets. Need access? Contact your cinema administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED: RENDER ACTIVE VALIDATOR LOCKED TO CURRENT CINEMA
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Banner with Authenticated Cinema Lock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-4.5 rounded-2xl glass-panel border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{currentTenant.name}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {currentTenant.tenantCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
              <MapPin className="w-3 h-3 text-teal-400" />
              <span>{currentTenant.branding.island}, {currentTenant.branding.atoll}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span>Door Gatekeeper Active</span>
              </span>
            </p>
          </div>
        </div>

        {/* Exit / Logout Button */}
        <button
          onClick={handleStaffLogout}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold text-slate-300 hover:text-rose-300 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Gatekeeper</span>
        </button>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Camera Feed & Manual Input */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-teal-400" />
                <span>Live Camera QR Scanner</span>
              </span>
              {isScanning && (
                <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE</span>
                </span>
              )}
            </h2>

            {/* Camera Viewport */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square flex flex-col items-center justify-center">
              <div id="qr-reader-container" className="w-full h-full" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                  <QrCode className="w-16 h-16 text-slate-700 mb-3" />
                  <p className="text-xs text-slate-400 mb-4 max-w-xs">
                    {t('validator.scanPrompt')}
                  </p>
                  <button
                    onClick={startCameraScanner}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Camera</span>
                  </button>
                </div>
              )}
            </div>

            {isScanning && (
              <button
                onClick={stopCameraScanner}
                className="w-full mt-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Stop Camera Feed
              </button>
            )}

            {cameraError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {cameraError}
              </div>
            )}
          </div>

          {/* Manual Reference Input */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t('validator.manualInput')}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidation(manualCode);
              }}
              className="flex space-x-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MV-7749-O or MV-9120-V"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition border border-amber-500/30"
              >
                Check
              </button>
            </form>
          </div>
        </div>

        {/* Right: Validation Feedback & Scan Result */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 min-h-[320px] flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Verification Status ({currentTenant.name})</span>
              </h2>

              {!validationResult ? (
                <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  <QrCode className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-xs">Awaiting QR scan or booking reference for {currentTenant.name}...</p>
                </div>
              ) : validationResult.valid ? (
                /* SUCCESSFUL VALIDATION */
                <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-4 animate-fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ACCESS GRANTED
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">
                        Welcome, {validationResult.booking?.guestName}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-lg p-3 text-xs space-y-2 border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Booking Ref:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {validationResult.booking?.bookingRef}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Seats ({validationResult.booking?.seats.length}):</span>
                      <span className="font-bold text-white">
                        {validationResult.booking?.seats.map((s) => s.label).join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Guest Phone:</span>
                      <span className="font-mono text-slate-300">{validationResult.booking?.guestPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Check-in Time:</span>
                      <span className="text-slate-300">
                        {new Date(validationResult.checkedInAt || '').toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : validationResult.alreadyCheckedIn ? (
                /* DUPLICATE WARNING */
                <div className="p-5 rounded-xl bg-rose-950/50 border border-rose-500/60 space-y-4 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-full bg-rose-500/20 text-rose-400">
                      <XCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        DUPLICATE USE DETECTED
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">
                        Already Checked In!
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-rose-200 leading-relaxed">
                    This ticket has already been scanned at the gate on{' '}
                    <strong className="text-white">
                      {new Date(validationResult.checkedInAt || '').toLocaleTimeString()}
                    </strong>.
                    Do not permit duplicate re-entry without manager clearance.
                  </p>
                </div>
              ) : (
                /* INVALID TICKET */
                <div className="p-5 rounded-xl bg-slate-900 border border-rose-500/30 space-y-3">
                  <div className="flex items-center space-x-3 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="font-bold text-sm">Validation Failed</h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    {validationResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scan History */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Gate Scan Log (Recent 10)</span>
            </h3>

            {scanHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No tickets checked in yet this session.</p>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 text-xs border border-slate-800"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.valid ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <span className="font-mono font-bold text-white">{item.ref}</span>
                      <span className="text-slate-400">({item.guest})</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
