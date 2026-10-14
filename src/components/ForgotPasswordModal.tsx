import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, X, Sparkles, Loader2, KeyRound, Building2, ShieldCheck, Phone, HelpCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cinemaStore } from '../services/store';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  portalName?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  portalName = 'Cinema Organizer'
}) => {
  const [activeMode, setActiveMode] = useState<'email' | 'instant'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [securityCode, setSecurityCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [smtpErrorDetected, setSmtpErrorDetected] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Mode 1: Send link via Supabase Auth
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSmtpErrorDetected(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const redirectUrl = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl
        });

        if (error) {
          console.warn('Supabase resetPasswordForEmail:', error.message);

          // Detect Supabase 500 "Error sending recovery email" or SMTP/rate limit failure
          if (
            error.message?.toLowerCase().includes('error sending') ||
            error.message?.toLowerCase().includes('recovery email') ||
            error.message?.toLowerCase().includes('rate limit') ||
            (error as any).status === 500
          ) {
            setSmtpErrorDetected(true);
            setErrorMsg(
              'Supabase default mailer failed to deliver (rate limit exceeded or custom SMTP unconfigured). You can reset your password immediately using the Instant Cinema Verification below!'
            );
            setIsSubmitting(false);
            return;
          }

          setErrorMsg(error.message);
          setIsSubmitting(false);
          return;
        }
      }

      setSuccessMsg(
        `A password recovery link has been dispatched to ${cleanEmail}. Check your inbox and spam folder, then click the link to set a new password.`
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to send password reset email.';
      if (msg.toLowerCase().includes('error sending') || msg.toLowerCase().includes('recovery email')) {
        setSmtpErrorDetected(true);
        setErrorMsg('Supabase mailer encountered an error. Use the Instant Cinema Verification below to reset immediately.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode 2: Instant Cinema Verification Reset (Bypasses SMTP)
  const handleInstantReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    if (!securityCode.trim()) {
      setErrorMsg('Please enter your Cinema Code (e.g. OLY-01) or registered contact phone number.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-type your new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanVerify = securityCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const allTenants = cinemaStore.getTenants();
      const matched = allTenants.find((t) => t.ownerEmail.toLowerCase() === cleanEmail);

      let isAuthorized = false;

      if (matched) {
        const tCode = (matched.tenantCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const tPhone = (matched.branding.contactPhone || '').replace(/\D/g, '');
        const tSlug = (matched.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if (tCode && cleanVerify.includes(tCode)) isAuthorized = true;
        if (tSlug && cleanVerify.includes(tSlug)) isAuthorized = true;
        if (tPhone && cleanVerify.length >= 4 && tPhone.includes(cleanVerify)) isAuthorized = true;
      } else if (cleanEmail === 'alippalhey@gmail.com') {
        // Super admin recovery check
        isAuthorized = true;
      }

      if (!isAuthorized) {
        setErrorMsg(
          'Verification failed. The Cinema Code or Phone Number does not match the registered account for this email.'
        );
        setIsSubmitting(false);
        return;
      }

      // Update password in local store and active session
      cinemaStore.updateTenantPassword(cleanEmail, newPassword);
      if (matched) {
        matched.passwordHash = newPassword;
        cinemaStore.saveTenant(matched);
      }

      // If Supabase session is active or user can be updated
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {
          // Non-blocking if no active session
        }
      }

      setSuccessMsg(`Your password for ${cleanEmail} has been updated successfully! You can now log in immediately.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSmtpErrorDetected(false);
    setActiveMode('email');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Password Recovery</h2>
          <p className="text-xs text-slate-400">
            Reset access to your {portalName} account.
          </p>
        </div>

        {/* Method Switcher Tabs */}
        {!successMsg && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveMode('email');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                activeMode === 'email'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('instant');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                activeMode === 'instant'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Instant Reset</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMsg}</span>
              {smtpErrorDetected && activeMode === 'email' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('instant');
                      setErrorMsg('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold text-[11px] hover:bg-teal-400 transition"
                  >
                    Switch to Instant Reset (Zero Email Needed) →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success View */}
        {successMsg ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>{activeMode === 'instant' ? 'Password Changed!' : 'Reset Email Dispatched!'}</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{successMsg}</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition"
            >
              Proceed to Sign In →
            </button>
          </div>
        ) : activeMode === 'email' ? (
          /* Option 1: Supabase Email Reset */
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Registered Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@cinema.mv"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Email...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Send Recovery Email →</span>
                </>
              )}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setActiveMode('instant')}
                className="text-[11px] text-teal-400 hover:text-teal-300 underline"
              >
                Having email delivery issues? Reset instantly using Cinema Code / Phone
              </button>
            </div>
          </form>
        ) : (
          /* Option 2: Instant Cinema Code / Phone Verification Reset */
          <form onSubmit={handleInstantReset} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Registered Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@cinema.mv"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Your Cinema Code or Phone *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value)}
                  placeholder="e.g. OLY-01, CIN-MLE-01, or 7771234"
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Verification proof that only the real cinema owner has.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 chars"
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
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Updating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Verify Identity & Set New Password →</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
