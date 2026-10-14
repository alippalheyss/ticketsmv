import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, KeyRound, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cinemaStore } from '../services/store';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Check if recovery session is active
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsRecoverySession(true);
          setUserEmail(session.user.email || '');
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session?.user) {
          setIsRecoverySession(true);
          if (session?.user?.email) setUserEmail(session.user.email);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          setErrorMsg(error.message);
          setIsSubmitting(false);
          return;
        }

        const emailToSync = data.user?.email || userEmail;
        if (emailToSync) {
          cinemaStore.updateTenantPassword(emailToSync, newPassword);
        }
      } else if (userEmail) {
        cinemaStore.updateTenantPassword(userEmail, newPassword);
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto shadow-xl shadow-teal-500/10">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Set New Password</h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          {userEmail ? (
            <>Resetting password for <strong className="text-teal-300 font-mono">{userEmail}</strong></>
          ) : (
            'Choose a strong new password for your CinemaMV account.'
          )}
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Password Updated Successfully!</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your new password has been saved. You can now use it to log in to your Cinema Organizer portal.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/admin"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-lg transition flex items-center justify-center space-x-2"
              >
                <span>Proceed to Organizer Portal →</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Minimum 6 characters. Use letters & numbers for strong security.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-xl shadow-teal-500/20 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Update Password & Save →</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
