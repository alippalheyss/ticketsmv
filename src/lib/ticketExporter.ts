import { jsPDF } from 'jspdf';
import { Booking, Movie, Showtime, Hall, Screen, Tenant } from '../types';

interface CleanTicketExportOptions {
  booking: Booking;
  movie: Movie;
  showtime: Showtime;
  hall?: Hall;
  screen?: Screen;
  tenant?: Tenant;
  qrDataUrl: string;
}

/**
 * Safely loads an image without tainting the canvas if CORS is restricted.
 */
function loadSafeImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // In case cross-origin fails, return null so canvas remains untainted
      resolve(null);
    };
    img.src = url;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Generates an ultra-crisp, clean digital admission ticket on an HTML5 canvas.
 */
export async function generateCleanTicketCanvas({
  booking,
  movie,
  showtime,
  hall,
  screen,
  tenant,
  qrDataUrl
}: CleanTicketExportOptions): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 1180;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Pre-load images with safe CORS handling
  const [posterImg, logoImg, qrImg] = await Promise.all([
    loadSafeImage(movie.posterUrl),
    loadSafeImage(tenant?.branding.logoUrl),
    loadSafeImage(qrDataUrl)
  ]);

  // 1. Outer Background
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, width, height);

  // 2. Ticket Card Background (with subtle gradient & rounded corners)
  const cardX = 24;
  const cardY = 24;
  const cardW = width - 48;
  const cardH = height - 48;
  const cardR = 24;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();

  // Card gradient fill
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#0f172a');
  cardGrad.addColorStop(0.5, '#0a0f1d');
  cardGrad.addColorStop(1, '#050811');
  ctx.fillStyle = cardGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // 3. Header: Cinema Banner
  const headerH = 120;
  const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
  headerGrad.addColorStop(0, '#042f2e'); // teal-950
  headerGrad.addColorStop(0.5, '#0f172a');
  headerGrad.addColorStop(1, '#083344'); // cyan-950
  ctx.fillStyle = headerGrad;
  ctx.fillRect(cardX, cardY, cardW, headerH);

  // Header bottom border
  ctx.fillStyle = 'rgba(20, 184, 166, 0.2)';
  ctx.fillRect(cardX, cardY + headerH - 1, cardW, 1);

  // Cinema Logo or Icon
  const logoSize = 64;
  const logoX = cardX + 24;
  const logoY = cardY + 28;

  if (logoImg) {
    ctx.save();
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    // Logo border
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 1.5;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#134e4a';
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
    ctx.fill();
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎬', logoX + logoSize / 2, logoY + 42);
  }

  // Cinema Name & Location
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 11px sans-serif';
  const islandStr = `${(tenant?.branding.island || 'Maldives').toUpperCase()} • ${(tenant?.branding.atoll || '').toUpperCase()}`;
  ctx.fillText(islandStr, logoX + logoSize + 16, logoY + 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  const tenantName = tenant?.name || 'Island Cinema';
  ctx.fillText(tenantName, logoX + logoSize + 16, logoY + 48);

  // Top-Right Booking Reference
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('OFFICIAL DIGITAL PASS', cardX + cardW - 24, logoY + 18);

  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(booking.bookingRef, cardX + cardW - 24, logoY + 48);

  // 4. Movie & Showtime Section
  const movieSecY = cardY + headerH + 28;
  const posterW = 160;
  const posterH = 240;
  const posterX = cardX + 24;

  if (posterImg) {
    ctx.save();
    roundRect(ctx, posterX, movieSecY, posterW, posterH, 16);
    ctx.clip();
    ctx.drawImage(posterImg, posterX, movieSecY, posterW, posterH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, posterX, movieSecY, posterW, posterH, 16);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, posterX, movieSecY, posterW, posterH, 16);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Movie Poster', posterX + posterW / 2, movieSecY + posterH / 2);
  }

  // Movie Details next to poster
  const detailsX = posterX + posterW + 24;
  let curY = movieSecY + 24;
  ctx.textAlign = 'left';

  // Age rating badge & Tagline
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#f59e0b';
  let badgeText = `[${movie.ageRating || 'PG-13'}]`;
  if (movie.tagline) {
    badgeText += `  ★ ${movie.tagline}`;
  }
  ctx.fillText(badgeText, detailsX, curY);
  curY += 30;

  // Title (English)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  const title = movie.titleEn.length > 26 ? movie.titleEn.substring(0, 24) + '...' : movie.titleEn;
  ctx.fillText(title, detailsX, curY);
  curY += 26;

  // Title (Dhivehi)
  if (movie.titleDv) {
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(movie.titleDv, detailsX, curY);
    curY += 32;
  } else {
    curY += 10;
  }

  // Date & Slot Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  roundRect(ctx, detailsX, curY, cardW - (detailsX - cardX) - 24, 110, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 1;
  roundRect(ctx, detailsX, curY, cardW - (detailsX - cardX) - 24, 110, 14);
  ctx.stroke();

  const boxInnerX = detailsX + 16;
  let boxY = curY + 26;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Date & Showtime:', boxInnerX, boxY);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${showtime.date} @ ${showtime.startTime}`, boxInnerX + 120, boxY);
  boxY += 26;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Hall & Layout:', boxInnerX, boxY);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  const isMultiScreen = booking.seats.some(s => s.screenId && s.screenId !== screen?.id);
  const layoutDesc = `${hall?.name || 'Main Hall'} • ${isMultiScreen ? 'Shared Hall' : (screen?.screenName || 'Screen 1')}`;
  ctx.fillText(layoutDesc, boxInnerX + 120, boxY);
  boxY += 26;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Duration & Genre:', boxInnerX, boxY);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${movie.durationMinutes || 120} mins • ${(movie.genre || []).slice(0, 2).join(', ') || 'Feature Film'}`, boxInnerX + 120, boxY);

  // 5. Booked Seats Bar
  const seatsSecY = movieSecY + posterH + 24;
  ctx.fillStyle = 'rgba(13, 148, 136, 0.08)';
  roundRect(ctx, cardX + 24, seatsSecY, cardW - 48, 70, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 184, 166, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, cardX + 24, seatsSecY, cardW - 48, 70, 14);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`BOOKED SEATS (${booking.seats.length}):`, cardX + 40, seatsSecY + 24);

  // Render seats tags
  const seatsText = booking.seats.map((s) => `${s.label} (${s.type})`).join('  •  ');
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(seatsText, cardX + 40, seatsSecY + 50);

  // 6. Tear-off Dashed Divider with Notches
  const dividerY = seatsSecY + 95;
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(cardX + 36, dividerY);
  ctx.lineTo(cardX + cardW - 36, dividerY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // Punch Notches (left & right circular cutouts)
  ctx.fillStyle = '#070b14';
  ctx.beginPath();
  ctx.arc(cardX, dividerY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cardX + cardW, dividerY, 18, 0, Math.PI * 2);
  ctx.fill();

  // 7. Attendee, Payment & QR Code Section
  const bottomSecY = dividerY + 30;

  // Left column: Guest & Payment details
  const guestX = cardX + 36;
  let gY = bottomSecY + 16;

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('PASS HOLDER / ATTENDEE:', guestX, gY);
  gY += 24;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(booking.guestName || 'Guest Attendee', guestX, gY);
  gY += 20;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText(`${booking.guestPhone} • ${booking.guestEmail}`, guestX, gY);
  gY += 36;

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('PAYMENT SUMMARY:', guestX, gY);
  gY += 24;

  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`MVR ${booking.totalAmount.toFixed(2)}`, guestX, gY);
  gY += 24;

  ctx.fillStyle = booking.paymentStatus === 'paid' ? '#34d399' : '#fbbf24';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`● STATUS: ${booking.paymentStatus.toUpperCase()} (${booking.paymentMethod.toUpperCase()})`, guestX, gY);

  // Right column: QR Code Box
  const qrBoxSize = 220;
  const qrBoxX = cardX + cardW - qrBoxSize - 36;
  const qrBoxY = bottomSecY;

  // White clean container for QR code
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
  ctx.fill();

  // Draw QR code image
  if (qrImg) {
    const qrImgSize = 160;
    const qrImgOffset = (qrBoxSize - qrImgSize) / 2;
    ctx.drawImage(qrImg, qrBoxX + qrImgOffset, qrBoxY + 12, qrImgSize, qrImgSize);
  }

  // QR Label below code
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  const shortHash = booking.qrCodeHash.length > 24 ? `${booking.qrCodeHash.substring(0, 22)}...` : booking.qrCodeHash;
  ctx.fillText(shortHash, qrBoxX + qrBoxSize / 2, qrBoxY + 185);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('CRYPTOGRAPHIC PASS', qrBoxX + qrBoxSize / 2, qrBoxY + 202);

  // 8. Footer Notice
  const footerY = cardY + cardH - 32;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.fillText(
    'Please present this digital pass at the cinema door scanner for immediate admission.',
    width / 2,
    footerY
  );
  ctx.fillStyle = '#475569';
  ctx.font = '10px sans-serif';
  ctx.fillText(
    'TicketsMV • Official Maldivian Admission Ticket • Non-Refundable',
    width / 2,
    footerY + 18
  );

  ctx.restore(); // Restore clipping
  return canvas;
}

/**
 * Downloads a clean digital admission ticket as a PNG image file.
 */
export async function exportTicketAsPng(options: CleanTicketExportOptions): Promise<void> {
  const canvas = await generateCleanTicketCanvas(options);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `ticket_${options.booking.bookingRef}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a clean digital admission ticket as a clean PDF file.
 */
export async function exportTicketAsPdf(options: CleanTicketExportOptions): Promise<void> {
  const canvas = await generateCleanTicketCanvas(options);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Clean soft dark background for presentation
  pdf.setFillColor(7, 11, 20);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Place clean ticket centered on page
  const ticketWidthMm = 145; // 145mm wide
  const ticketHeightMm = (canvas.height * ticketWidthMm) / canvas.width;
  const x = (pageWidth - ticketWidthMm) / 2;
  const y = Math.max(12, (pageHeight - ticketHeightMm) / 2);

  pdf.addImage(imgData, 'PNG', x, y, ticketWidthMm, ticketHeightMm, undefined, 'FAST');
  pdf.save(`ticket_${options.booking.bookingRef}.pdf`);
}
