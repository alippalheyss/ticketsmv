import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="no-print border-t border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md pt-12 pb-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Col 1: Platform Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white">CinemaMV.online</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Progressive web app for discovering and booking movie tickets across Maldivian cinema halls, youth centers, and island community auditoriums.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-teal-400">
              <span>🇲🇻 Malé & Island Atolls</span>
              <span>•</span>
              <span>Maldivian Rufiyaa (MVR)</span>
            </div>
          </div>

          {/* Col 2: Island Cinema Hubs */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/" className="hover:text-teal-300 transition">
                  Browse Cinemas &amp; Movies
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-teal-300 transition">
                  Host Your Cinema (Organizers)
                </Link>
              </li>
              <li>
                <Link to="/validator" className="hover:text-teal-300 transition">
                  Door Ticket Scanner
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Island Network */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Island Network
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Connecting movie fans with local island auditoriums, youth centers, and screening venues throughout Maldives.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} CinemaMV.online. All rights reserved across Maldivian Atolls.</p>
          <p className="text-[11px] text-slate-600">Empowering Maldivian island cinemas & local film arts.</p>
        </div>
      </div>
    </footer>
  );
};
