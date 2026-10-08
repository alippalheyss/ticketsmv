import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { cinemaStore } from '../services/store';
import { Booking, Showtime, Screen, Movie, Hall, Tenant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  CheckCircle2, Download, Calendar, Printer, Mail, Share2, 
  Sparkles, MapPin, Clock, Ticket, ShieldCheck, ExternalLink, ArrowLeft,
  FileText, Loader2
} from 'lucide-react';
import { exportTicketAsPng, exportTicketAsPdf } from '../lib/ticketExporter';

export const TicketPassPage: React.FC = () => {
  const { bookingRef } = useParams<{ bookingRef: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, isDhivehi } = useLanguage();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [hall, setHall] = useState<Hall | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!bookingRef) return;
    const b = cinemaStore.getBookingByRef(bookingRef);
    if (b) {
      setBooking(b);
      const st = cinemaStore.getShowtimeById(b.showtimeId);
      if (st) {
        setShowtime(st);
        const sc = cinemaStore.getScreenById(st.screenId);
        if (sc) setScreen(sc);
        const mv = cinemaStore.getMovieById(st.movieId);
        if (mv) setMovie(mv);
        const hl = cinemaStore.getHalls().find((h) => h.id === st.hallId);
        if (hl) setHall(hl);
        const tn = cinemaStore.getTenantById(st.tenantId);
        if (tn) setTenant(tn);
      }

      // Generate Cryptographic QR code with signed hash payload
      QRCode.toDataURL(b.qrCodeHash, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0a0f1d',
          light: '#ffffff'
        }
      }).then((url) => {
        setQrDataUrl(url);
      }).catch(err => console.error('QR code render error:', err));
    }
  }, [bookingRef]);

  if (!booking || !movie || !showtime) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Ticket Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">
          Could not locate booking reference "{bookingRef}".
        </p>
        <Link to="/" className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs">
          Return to Home
        </Link>
      </div>
    );
  }

  // Generate .ics Calendar Invite file
  const downloadIcsCalendar = () => {
    const startStr = `${showtime.date.replace(/-/g, '')}T${showtime.startTime.replace(':', '')}00`;
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CinemaMV.online//Maldivian Cinema Pass//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${booking.id}@cinemamv.online
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startStr}
SUMMARY:Movie: ${movie.titleEn} (${movie.titleDv})
DESCRIPTION:CinemaMV.online digital booking pass for ${movie.titleEn}. Seats: ${booking.seats.map(s => s.label).join(', ')}. Cinema: ${tenant?.name || 'Island Hall'}.
LOCATION:${hall?.name || 'Maldivian Cinema Hall'}, ${tenant?.branding.island || 'Maldives'}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ticket_${booking.bookingRef}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Download Clean Ticket as PNG Image
  const downloadTicketImage = async () => {
    if (!booking || !movie || !showtime) return;
    setIsDownloadingImage(true);
    try {
      await exportTicketAsPng({
        booking,
        movie,
        showtime,
        hall: hall || undefined,
        screen: screen || undefined,
        tenant: tenant || undefined,
        qrDataUrl
      });
    } catch (err) {
      console.error('Failed to export ticket as image:', err);
      alert('Could not export ticket image. Please try again.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Download Clean Ticket as PDF Document
  const downloadTicketPdf = async () => {
    if (!booking || !movie || !showtime) return;
    setIsDownloadingPdf(true);
    try {
      await exportTicketAsPdf({
        booking,
        movie,
        showtime,
        hall: hall || undefined,
        screen: screen || undefined,
        tenant: tenant || undefined,
        qrDataUrl
      });
    } catch (err) {
      console.error('Failed to export ticket as PDF:', err);
      alert('Could not export ticket PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const isPendingTransfer = booking.paymentStatus === 'pending_verification';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Confirmed Badge & Actions */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <Link
          to="/"
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadTicketImage}
            disabled={isDownloadingImage}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/40 transition disabled:opacity-50"
            title="Download Ticket as PNG Image"
          >
            {isDownloadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isDownloadingImage ? 'Exporting...' : 'Save Image'}</span>
          </button>

          <button
            onClick={downloadTicketPdf}
            disabled={isDownloadingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-semibold border border-teal-500/40 transition disabled:opacity-50"
            title="Download Ticket as PDF Document"
          >
            {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-teal-400" />}
            <span>{isDownloadingPdf ? 'Exporting...' : 'Save PDF'}</span>
          </button>

          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Preview Sent Email"
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Email</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Confirmation Status Banner */}
      <div className="no-print">
        {isPendingTransfer ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-3 text-amber-300">
            <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Transfer Slip Submitted (Verification Pending)</h3>
              <p className="text-xs text-amber-200/80">
                Your seats are reserved for 15 minutes while the cinema organizer verifies your BML/MIB transfer slip.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-300">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">{t('ticket.confirmed')}</h3>
              <p className="text-xs text-emerald-200/80">
                A digital pass copy has been sent to <strong className="text-white">{booking.guestEmail}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Digital Pass Ticket Card (Optimized for Screen, Print, Image & PDF export) */}
      <div id="ticket-pass-element" className="relative rounded-3xl overflow-hidden shadow-2xl bg-[#0f172a] border border-slate-700 ticket-print-card">
        {/* Cinema Header */}
        <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-cyan-900/60 p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img
              src={tenant?.branding.logoUrl}
              alt={tenant?.name}
              className="w-12 h-12 rounded-xl object-cover border border-teal-500/30"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {tenant?.branding.island} • {tenant?.branding.atoll}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">{tenant?.name}</h2>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {t('ticket.ref')}
            </span>
            <span className="font-mono text-xl font-extrabold text-teal-300 tracking-wider">
              {booking.bookingRef}
            </span>
          </div>
        </div>

        {/* Movie Info & Seats Layout */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Movie Poster & Metadata (7 cols) */}
          <div className="md:col-span-7 flex space-x-4">
            <img
              src={movie.posterUrl}
              alt={movie.titleEn}
              className="w-24 h-36 object-cover rounded-xl border border-slate-700 shadow-md flex-shrink-0"
            />
            <div className="space-y-2">
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl text-white leading-tight">
                  {movie.titleEn}
                </h3>
                <h4 className="font-dhivehi text-teal-400 text-sm font-semibold">
                  {movie.titleDv}
                </h4>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>{hall?.name} • {booking.seats.some(s => s.screenId && s.screenId !== screen?.id) ? 'Shared Hall' : screen?.screenName}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-mono text-white font-bold">{showtime.date} @ {showtime.startTime}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Booked Seats ({booking.seats.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {booking.seats.map((s) => {
                    const scr = cinemaStore.getScreenById(s.screenId || '');
                    return (
                      <span
                        key={`${s.screenId || ''}_${s.seatId}`}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/40"
                      >
                        {scr ? `${scr.screenName}: ` : ''}{s.label} ({s.type})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Signed QR Code Section (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-900 border border-slate-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Ticket QR Code"
                className="w-44 h-44 object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center bg-slate-100 text-xs">
                Rendering QR...
              </div>
            )}
            <span className="font-mono text-[10px] font-bold tracking-widest text-slate-600 mt-1 uppercase">
              {booking.qrCodeHash.substring(0, 24)}...
            </span>
            <span className="text-[10px] text-slate-500 text-center font-medium mt-0.5">
              Cryptographically Signed Pass
            </span>
          </div>
        </div>

        {/* Dashed Tear-off Divider */}
        <div className="relative border-t-2 border-dashed border-slate-800 my-2">
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[#070b14]" />
          <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-[#070b14]" />
        </div>

        {/* Bottom Pass Details */}
        <div className="p-6 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500">Attendee:</span>
            <p className="font-bold text-white text-sm">{booking.guestName}</p>
            <p className="font-mono text-slate-400">{booking.guestPhone} • {booking.guestEmail}</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-slate-500">Payment Summary:</span>
            <p className="font-mono text-base font-bold text-teal-300">
              {formatCurrency(booking.totalAmount)}
            </p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {booking.paymentStatus} via {booking.paymentMethod.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Download as Image / PDF & Calendar */}
      <div className="no-print space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={downloadTicketImage}
            disabled={isDownloadingImage}
            className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isDownloadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isDownloadingImage ? 'Generating Image...' : 'Download Ticket Image (PNG)'}</span>
          </button>

          <button
            onClick={downloadTicketPdf}
            disabled={isDownloadingPdf}
            className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Ticket (PDF)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
          >
            <Ticket className="w-4 h-4 text-teal-400" />
            <span>Book Another Movie</span>
          </button>

          <button
            onClick={downloadIcsCalendar}
            className="flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Add to Calendar (.ics)</span>
          </button>
        </div>
      </div>

      {/* Modal: Transactional Email Viewer */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-teal-400" />
                  <span>Transactional Email Dispatch Preview</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Recipient: <span className="font-mono text-teal-300">{booking.guestEmail}</span> (via Resend/Postmark API)
                </p>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Email HTML Template Simulation */}
            <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-inner font-sans text-xs space-y-4">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <span className="font-bold text-sm text-teal-800">CinemaMV.online • {tenant?.name}</span>
                <span className="font-mono text-slate-500">Ref: {booking.bookingRef}</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">Your Movie Ticket is Confirmed!</h4>
                <p className="text-slate-600 mt-1">
                  Hi {booking.guestName}, thank you for booking your movie screening tickets with CinemaMV.online.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-sm text-slate-900">{movie.titleEn} ({movie.titleDv})</div>
                <div>Cinema: {tenant?.name} ({hall?.name})</div>
                <div>Screen: {screen?.screenName}</div>
                <div>Showtime: {showtime.date} at {showtime.startTime}</div>
                <div className="font-bold text-teal-700">
                  Seats: {booking.seats.map(s => s.label).join(', ')}
                </div>
                <div>Total Paid: MVR {booking.totalAmount.toFixed(2)}</div>
              </div>

              <div className="text-center py-2">
                {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-32 h-32 mx-auto" />}
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{booking.qrCodeHash}</p>
                <p className="text-xs font-semibold text-slate-700 mt-2">
                  Please show this QR code at the entrance gate for single-use check-in.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 text-center">
                CinemaMV.online • The Official Maldivian Island Movie Ticketing Network • Male', Maldives
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
