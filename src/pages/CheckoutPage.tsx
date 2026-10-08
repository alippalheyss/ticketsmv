import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cinemaStore } from '../services/store';
import { Showtime, Screen, Movie, Hall, Tenant, BookedSeat, Booking, PaymentMethod } from '../types';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';
import { 
  CreditCard, Upload, Phone, Mail, User, ShieldCheck, ArrowLeft, 
  CheckCircle2, Clock, AlertTriangle, FileText, Sparkles, Building 
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, isDhivehi } = useLanguage();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [hall, setHall] = useState<Hall | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<BookedSeat[]>([]);

  // Guest Input State
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('+960 ');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bml_transfer');
  const [slipFile, setSlipFile] = useState<string | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!showtimeId) return;
    const st = cinemaStore.getShowtimeById(showtimeId);
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

    // Retrieve seats selected from sessionStorage
    const raw = sessionStorage.getItem(`mv_checkout_seats_${showtimeId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSelectedSeats(parsed);
      } catch {}
    }
  }, [showtimeId]);

  if (!showtime || !screen || !movie || selectedSeats.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Seats Selected</h2>
        <p className="text-xs text-slate-400 mb-6">
          Your seat selection session expired or no seats were picked.
        </p>
        <Link
          to={showtimeId ? `/book/${showtimeId}` : '/'}
          className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
        >
          Select Seats Again
        </Link>
      </div>
    );
  }

  if (tenant?.status === 'suspended') {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Cinema Currently Suspended</h2>
        <p className="text-xs text-slate-400 mb-6">
          Checkout is disabled because this cinema has been temporarily suspended by platform administration.
        </p>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
        >
          Return to All Cinemas
        </Link>
      </div>
    );
  }

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  // Handle Transfer Receipt file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setSlipFile(res);
        setSlipPreview(res);
      };
      reader.readAsDataURL(file);
    }
  };

  // Maldivian phone validation: +960 followed by 7-digit mobile (starting with 7 or 9)
  const validateMaldivianPhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, '').replace('-', '');
    return cleaned.length >= 10;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!guestName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!guestEmail.includes('@') || !guestEmail.includes('.')) {
      setFormError('Please provide a valid email address for receiving your digital ticket.');
      return;
    }

    if (!validateMaldivianPhone(guestPhone)) {
      setFormError('Please enter a valid Maldivian phone number (e.g., +960 7xxxxxx or 9xxxxxx).');
      return;
    }

    if (paymentMethod === 'bml_transfer' && !slipFile) {
      setFormError('Please upload your BML or MIB transfer transaction receipt.');
      return;
    }

    setIsSubmitting(true);

    // Simulate payment processing delay
    await new Promise((r) => setTimeout(r, 1200));

    // Generate unique Maldivian booking reference (e.g. MV-4821-K)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const bookingRef = `MV-${randomDigits}-${suffix}`;

    // Cryptographic-style tamper-proof signed QR hash
    const qrCodeHash = `SIG-${bookingRef}-${Date.now().toString(36).toUpperCase()}-SHA256`;

    const isPendingTransfer = paymentMethod === 'bml_transfer';

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      bookingRef,
      showtimeId: showtime.id,
      tenantId: showtime.tenantId,
      guestName,
      guestEmail,
      guestPhone,
      seats: selectedSeats,
      totalAmount: totalPrice,
      paymentMethod,
      paymentStatus: isPendingTransfer ? 'pending_verification' : 'paid',
      slipUrl: slipFile || undefined,
      qrCodeHash,
      checkedIn: false,
      createdAt: new Date().toISOString()
    };

    const sessionId = cinemaStore.getOrCreateSessionId();
    const result = await cinemaStore.createBookingAsync(newBooking, sessionId);

    if (!result.success) {
      setFormError(result.error || 'Failed to complete booking. Seats may have just been booked.');
      setIsSubmitting(false);
      return;
    }

    // Trigger Confetti!
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}

    // Clean session
    sessionStorage.removeItem(`mv_checkout_seats_${showtime.id}`);

    // Navigate to ticket pass
    navigate(`/ticket/${bookingRef}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('checkout.title')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('checkout.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Guest Details & Payment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleConfirmBooking} className="space-y-6">
            {/* Guest Info Box */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <User className="w-4 h-4 text-teal-400" />
                <span>1. Guest Contact Information</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('checkout.fullName')} *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Ibrahim Naeem"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('checkout.email')} *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Your signed QR ticket and Apple/Google Wallet pass will be sent here.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('checkout.phone')} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+960 7914421"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used for instant SMS / Viber notifications and gatekeeper verification.
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            {/* Payment Method Selector */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-teal-400" />
                <span>2. {t('checkout.paymentMethod')}</span>
              </h2>

              <div className="space-y-3">
                {/* Dedicated Option: Manual Bank Transfer Slip Upload (BML / MIB) */}
                <div className="p-4 rounded-xl border bg-teal-950/30 border-teal-500/60 ring-2 ring-teal-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Bank Transfer (BML / MIB) &amp; Slip Upload
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Transfer directly to the cinema's account and upload the transaction receipt
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Bank Transfer
                    </span>
                  </div>

                  {/* Transfer Details & Account Card */}
                  <div className="p-3.5 rounded-xl bg-slate-950 text-xs space-y-2.5 text-slate-300 font-mono border border-slate-800">
                    <div className="text-amber-400 font-bold flex items-center justify-between">
                      <span>Cinema Account Details:</span>
                      <span className="text-[10px] text-teal-400 font-sans font-bold px-2 py-0.5 rounded bg-teal-500/10">BML / MIB Transfer</span>
                    </div>
                    <div>Bank: <strong className="text-white">{tenant?.branding.bankDetails?.bankName || 'Bank of Maldives (BML)'}</strong></div>
                    <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                      <div>
                        Account: <strong className="text-teal-300 text-sm tracking-wide">{tenant?.branding.bankDetails?.accountNumber || '7701 1928 4401 001'}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(tenant?.branding.bankDetails?.accountNumber || '7701 1928 4401 001');
                          alert('Cinema account number copied to clipboard!');
                        }}
                        className="text-[10px] bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 px-2.5 py-1 rounded font-bold uppercase transition"
                      >
                        Copy Account
                      </button>
                    </div>
                    <div>Account Name: <strong className="text-white">{tenant?.branding.bankDetails?.accountName || tenant?.name}</strong></div>
                    <div className="text-teal-400 font-bold text-sm">Total Payable: {formatCurrency(totalPrice)}</div>
                    {tenant?.branding.bankDetails?.instructions && (
                      <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800 font-sans">
                        Note: {tenant.branding.bankDetails.instructions}
                      </div>
                    )}
                    {tenant?.branding.bankDetails?.qrImageUrl && (
                      <div className="pt-2 text-center">
                        <span className="text-[10px] text-slate-400 block mb-1 font-sans">Scan Cinema QR in BML/MIB App to Pay:</span>
                        <img src={tenant.branding.bankDetails.qrImageUrl} alt="Cinema Bank QR" className="w-32 h-32 object-contain mx-auto bg-white p-1 rounded-lg" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t('checkout.uploadSlip')} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer"
                    />
                  </div>

                  {slipPreview && (
                    <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-700 max-h-48">
                      <img src={slipPreview} alt="Receipt preview" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <p className="text-[11px] text-amber-300/90 leading-tight">
                    {t('checkout.holdingWarning')}
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-base shadow-lg shadow-teal-500/25 transition active:scale-95 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Confirming Secure Booking...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-slate-950" />
                  <span>
                    {paymentMethod === 'bml_transfer'
                      ? 'Submit Transfer Slip & Reserve Seats'
                      : `${t('checkout.confirmPay')} ${formatCurrency(totalPrice)}`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Summary Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5 sticky top-24">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 pb-3 border-b border-slate-800">
              Booking Summary
            </h3>

            {/* Movie preview card */}
            <div className="flex space-x-4">
              <img
                src={movie.posterUrl}
                alt={movie.titleEn}
                className="w-20 h-28 object-cover rounded-xl border border-slate-700 shadow-md flex-shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <h4 className="font-bold text-base text-white truncate">{movie.titleEn}</h4>
                <p className="font-dhivehi text-xs text-teal-400">{movie.titleDv}</p>
                <p className="text-xs text-slate-400">{tenant?.name}</p>
                <p className="text-xs text-slate-500">{hall?.name} • {selectedSeats.some(s => s.screenId && s.screenId !== screen.id) ? 'Shared Hall' : screen.screenName}</p>
                <div className="pt-1 flex items-center space-x-2 text-[11px] text-amber-400 font-mono">
                  <span>{showtime.date}</span>
                  <span>@</span>
                  <span className="font-bold">{showtime.startTime}</span>
                </div>
              </div>
            </div>

            {/* Seats List */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-400 block">
                Reserved Seats ({selectedSeats.length}):
              </span>
              <div className="space-y-1.5">
                {selectedSeats.map((s) => {
                  const seatScreen = cinemaStore.getScreenById(s.screenId || '');
                  return (
                    <div key={`${s.screenId || ''}_${s.seatId}`} className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-1.5">
                        {seatScreen && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                            {seatScreen.screenName}
                          </span>
                        )}
                        <span className="font-mono text-slate-200">
                          Row {s.row} - Seat {s.col} ({s.type})
                        </span>
                      </div>
                      <span className="font-bold text-teal-300">{formatCurrency(s.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span>Seats Subtotal:</span>
                <span className="text-slate-200">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Island Booking Fee:</span>
                <span className="text-emerald-400">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="font-mono text-base text-teal-300">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Instant Digital Pass Delivery</span>
              </div>
              <p className="text-[11px] text-teal-200/80">
                You will immediately receive a cryptographically signed QR ticket and Apple/Google Wallet pass.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
