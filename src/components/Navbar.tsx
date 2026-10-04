import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Film, Globe, Download, Menu, X, Sparkles, Building2 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t, isDhivehi } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 bg-[#070b14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-300 bg-clip-text text-transparent ${isDhivehi ? 'font-dhivehi' : ''}`}>
                  {t('platform.title')}
                </span>
              </div>
              <p className={`text-xs text-slate-400 hidden sm:block ${isDhivehi ? 'font-dhivehi text-[11px]' : ''}`}>
                {t('platform.subtitle')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links - Kept clean without redundant link */}
          <nav className="hidden md:flex items-center space-x-2">
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Install PWA Prompt Button */}
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-teal-500/25 animate-pulse"
                title="Install to Home Screen"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'dv' : 'en')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition"
              title="Toggle Dhivehi / English"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span className={language === 'en' ? 'font-dhivehi text-sm font-bold text-teal-300' : 'font-sans font-bold'}>
                {language === 'en' ? 'ދިވެހި' : 'English'}
              </span>
            </button>

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Purely Guest Links */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0f1d] border-b border-slate-800 px-4 pt-3 pb-5 space-y-2">
          {canInstall && (
            <button
              onClick={() => {
                handleInstallClick();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-teal-500 text-slate-950 font-semibold text-sm mb-3"
            >
              <Download className="w-4 h-4" />
              <span>Add CinemaMV.online to Home Screen</span>
            </button>
          )}

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-800/80"
          >
            {isDhivehi ? 'ހުރިހާ ފިލްމުތައް' : 'Browse All Movies'}
          </Link>
        </div>
      )}
    </header>
  );
};
