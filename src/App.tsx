import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { TenantPortalPage } from './pages/TenantPortalPage';
import { BookingPage } from './pages/BookingPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TicketPassPage } from './pages/TicketPassPage';
import { ValidatorPage } from './pages/ValidatorPage';
import { TenantAdminPage } from './pages/TenantAdminPage';
import { SuperAdminPage } from './pages/SuperAdminPage';

import { AdminHubPage } from './pages/AdminHubPage';
import { cinemaStore } from './services/store';

function RootRouteHandler() {
  const host = window.location.hostname;
  const parts = host.split('.');

  // Subdomain detection:
  // e.g. "olympus.cinemamv.online" -> parts: ['olympus', 'cinemamv', 'online'] -> subdomain: 'olympus'
  // e.g. "olympus.localhost" -> parts: ['olympus', 'localhost'] -> subdomain: 'olympus'
  const isSubdomain = 
    (parts.length >= 3 && parts[0] !== 'www' && !host.endsWith('.vercel.app')) ||
    (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'www');

  if (isSubdomain) {
    const slug = parts[0].toLowerCase();
    const tenant = cinemaStore.getTenantBySlug(slug);
    if (tenant) {
      return <TenantPortalPage tenantSlugFromHost={slug} />;
    }
  }

  return <HomePage />;
}

export function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-teal-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Role C: End Users / Guests (Subdomain-aware root) */}
              <Route path="/" element={<RootRouteHandler />} />
              <Route path="/t/:tenantSlug" element={<TenantPortalPage />} />
              <Route path="/book/:showtimeId" element={<BookingPage />} />
              <Route path="/checkout/:showtimeId" element={<CheckoutPage />} />
              <Route path="/ticket/:bookingRef" element={<TicketPassPage />} />

              {/* Dedicated Admin Gateway */}
              <Route path="/admin" element={<AdminHubPage />} />

              {/* Administrative Sub-portals */}
              <Route path="/admin/tenant" element={<TenantAdminPage />} />
              <Route path="/admin/super" element={<SuperAdminPage />} />
              <Route path="/admin/validator" element={<ValidatorPage />} />
              <Route path="/validator" element={<ValidatorPage />} />
              <Route path="/tenant-admin" element={<TenantAdminPage />} />
              <Route path="/super-admin" element={<SuperAdminPage />} />

              {/* Fallback */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
