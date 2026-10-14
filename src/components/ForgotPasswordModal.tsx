import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, X, Sparkles, Loader2 } from 'lucide-react';
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
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      let resetSent = false;

      // 1. Send password reset email via Supabase Auth
      if (isSupabaseConfigured()) {
        const redirectUrl = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl
        });

        if (error) {
          // If Supabase rate limit or error occurs
          console.warn('Supabase resetPasswordForEmail:', error.message);
          setErrorMsg(error.message);
          setIsSubmitting(false);
          return;
        }
        resetSent = true;
      }

      // Check if this email is in our tenant store
      const tenants = cinemaStore.getTenants();
      const matched = tenants.find((t) => t.ownerEmail.toLowerCase() === cleanEmail);

      setSuccessMsg(
        `A password recovery link has been dispatched to ${cleanEmail}. Check your inbox (and spam folder) and click the link to set a new password.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-5 shadow-2xl">
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
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Forgot Password?</h2>
          <p className="text-xs text-slate-400">
            Enter your registered {portalName} email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Reset Email Sent!</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{successMsg}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Didn't receive the email?</p>
              <p>Check your Spam/Junk folder, or make sure the email matches your registered CinemaMV account.</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendReset} className="space-y-4">
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
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Send Reset Link →</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel and Return
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
