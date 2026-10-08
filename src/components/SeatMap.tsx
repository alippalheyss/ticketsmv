import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Screen, Showtime, SeatConfig, SeatType, BookedSeat 
} from '../types';
import { cinemaStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';
import { Clock, ShieldAlert, Check, Accessibility, Users, Sparkles, AlertCircle } from 'lucide-react';

interface SeatMapProps {
  screen: Screen;
  showtime: Showtime;
  onSeatSelectionChange: (selectedSeats: BookedSeat[]) => void;
  onHoldExpired?: () => void;
  maxSelectable?: number;
  initialSelectedSeatIds?: string[];
  totalHallSelectedCount?: number;
  hallMaxSelectable?: number;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  screen,
  showtime,
  onSeatSelectionChange,
  onHoldExpired,
  maxSelectable = 8,
  initialSelectedSeatIds,
  totalHallSelectedCount,
  hallMaxSelectable = 8,
}) => {
  const { t, formatCurrency, isDhivehi } = useLanguage();
  const sessionId = useMemo(() => cinemaStore.getOrCreateSessionId(), []);

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(initialSelectedSeatIds || []);
  const [bookedSeatIds, setBookedSeatIds] = useState<Set<string>>(new Set());
  const [otherUserHolds, setOtherUserHolds] = useState<Map<string, number>>(new Map()); // seatId -> expiresAt
  const [remainingTimeSec, setRemainingTimeSec] = useState<number | null>(null);

  // Sync when screen or initialSelectedSeatIds changes
  useEffect(() => {
    if (initialSelectedSeatIds !== undefined) {
      setSelectedSeatIds(initialSelectedSeatIds);
    }
  }, [screen.id, initialSelectedSeatIds]);

  // Load booked seats and active holds
  const refreshSeatStates = useCallback(() => {
    const booked = cinemaStore.getBookedSeatIds(showtime.id, screen.id);
    setBookedSeatIds(booked);

    const holds = cinemaStore.getSeatHolds(showtime.id, screen.id);
    const otherMap = new Map<string, number>();
    let earliestMyHoldExpiry: number | null = null;

    holds.forEach((h) => {
      if (h.sessionId === sessionId) {
        if (!earliestMyHoldExpiry || h.expiresAt < earliestMyHoldExpiry) {
          earliestMyHoldExpiry = h.expiresAt;
        }
      } else {
        otherMap.set(h.seatId, h.expiresAt);
      }
    });

    setOtherUserHolds(otherMap);

    if (earliestMyHoldExpiry) {
      const secLeft = Math.max(0, Math.floor((earliestMyHoldExpiry - Date.now()) / 1000));
      setRemainingTimeSec(secLeft);
    } else if (selectedSeatIds.length === 0) {
      setRemainingTimeSec(null);
    }
  }, [showtime.id, screen.id, sessionId, selectedSeatIds.length]);

  // Subscribe to store updates (multi-tab synchronized)
  useEffect(() => {
    refreshSeatStates();
    const unsubscribe = cinemaStore.subscribe(() => {
      refreshSeatStates();
    });
    return () => unsubscribe();
  }, [refreshSeatStates]);

  // 1-second interval countdown for 10-minute hold lock
  useEffect(() => {
    if (remainingTimeSec === null || remainingTimeSec <= 0) return;

    const timer = setInterval(() => {
      setRemainingTimeSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Release holds on expiry
          cinemaStore.releaseAllSessionHolds(showtime.id, sessionId);
          setSelectedSeatIds([]);
          onSeatSelectionChange([]);
          if (onHoldExpired) onHoldExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingTimeSec, showtime.id, sessionId, onHoldExpired, onSeatSelectionChange]);

  // Helper to calculate price for a seat type
  const getSeatPrice = useCallback((seat: SeatConfig): number => {
    const tiers = showtime.priceTiers;
    switch (seat.type) {
      case 'vip':
        return tiers.vip || 150;
      case 'couple':
        return tiers.couple || 250;
      case 'accessible':
        return tiers.accessible || 80;
      case 'standard':
      default:
        return tiers.standard || 100;
    }
  }, [showtime.priceTiers]);

  // Handle seat click
  const handleSeatClick = (seat: SeatConfig) => {
    if (seat.type === 'aisle' || seat.type === 'space' || !seat.active) return;
    if (bookedSeatIds.has(seat.id)) return;
    if (otherUserHolds.has(seat.id)) return;

    const isCurrentlySelected = selectedSeatIds.includes(seat.id);

    if (isCurrentlySelected) {
      // Deselect
      cinemaStore.releaseSeatHold(showtime.id, seat.id, sessionId, screen.id);
      const next = selectedSeatIds.filter((id) => id !== seat.id);
      setSelectedSeatIds(next);

      const mapped: BookedSeat[] = next.map((id) => {
        const found = screen.layout.seats.find((s) => s.id === id)!;
        return {
          seatId: found.id,
          row: found.row,
          col: found.col,
          label: found.id,
          type: found.type,
          price: getSeatPrice(found),
          screenId: screen.id,
        };
      });
      onSeatSelectionChange(mapped);

      if (next.length === 0) {
        setRemainingTimeSec(null);
      }
    } else {
      // Check total hall booking limit (max 8 across hall)
      const totalHallCount = totalHallSelectedCount !== undefined
        ? totalHallSelectedCount
        : selectedSeatIds.length;
      const limit = hallMaxSelectable ?? maxSelectable;

      if (totalHallCount >= limit || selectedSeatIds.length >= maxSelectable) {
        alert(`You can select a maximum of ${limit} seats in total across all screens in the hall.`);
        return;
      }

      // Try acquiring 10-minute hold lock
      const acquired = cinemaStore.acquireSeatHold(showtime.id, seat.id, sessionId, 10, screen.id);
      if (!acquired) {
        alert('This seat is currently held or was just booked by another guest. Please pick another.');
        refreshSeatStates();
        return;
      }

      const next = [...selectedSeatIds, seat.id];
      setSelectedSeatIds(next);

      const mapped: BookedSeat[] = next.map((id) => {
        const found = screen.layout.seats.find((s) => s.id === id)!;
        return {
          seatId: found.id,
          row: found.row,
          col: found.col,
          label: found.id,
          type: found.type,
          price: getSeatPrice(found),
          screenId: screen.id,
        };
      });
      onSeatSelectionChange(mapped);

      // Reset / start hold timer at 10 minutes (600 seconds)
      setRemainingTimeSec(600);
    }
  };

  // Group seats by row
  const rowsMap = useMemo(() => {
    const map = new Map<string, SeatConfig[]>();
    screen.layout.seats.forEach((seat) => {
      if (!map.has(seat.row)) {
        map.set(seat.row, []);
      }
      map.get(seat.row)!.push(seat);
    });
    // Sort columns within row
    map.forEach((seats) => seats.sort((a, b) => a.col - b.col));
    return map;
  }, [screen.layout.seats]);

  // Format mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full select-none">
      {/* 10-Minute Hold Timer Banner */}
      {remainingTimeSec !== null && remainingTimeSec > 0 && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between transition-all ${
          remainingTimeSec < 120 
            ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300 animate-pulse'
            : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {t('timer.holdNotice')} {formatTimer(remainingTimeSec)} {t('timer.minutes')}
              </p>
              <p className="text-xs text-slate-400">
                Seats are temporarily locked for your checkout session to prevent double-booking.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-amber-400">
              {formatTimer(remainingTimeSec)}
            </span>
          </div>
        </div>
      )}

      {/* Screen Visual Indicator */}
      <div className="mb-10 text-center">
        <div className="cinema-screen-curve mx-auto max-w-2xl mb-2" />
        <div className="text-xs uppercase tracking-widest text-teal-400 font-semibold flex items-center justify-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>{screen.layout.stageName || t('seats.screen')}</span>
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
        </div>
      </div>

      {/* Seat Matrix Grid */}
      <div className="overflow-x-auto pb-6 px-2">
        <div className="min-w-fit mx-auto flex flex-col items-center space-y-2.5">
          {Array.from(rowsMap.entries()).map(([rowLabel, seatsInRow]) => (
            <div key={rowLabel} className="flex items-center space-x-3">
              {/* Row identifier left */}
              <div className="w-6 text-center text-xs font-bold text-slate-400">
                {rowLabel}
              </div>

              {/* Seats in this row */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {seatsInRow.map((seat) => {
                  if (seat.type === 'aisle' || seat.type === 'space' || !seat.active) {
                    return (
                      <div
                        key={seat.id}
                        className="w-7 h-7 sm:w-9 sm:h-9 invisible pointer-events-none"
                      />
                    );
                  }

                  const isSold = bookedSeatIds.has(seat.id);
                  const isHeldByOther = otherUserHolds.has(seat.id);
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const price = getSeatPrice(seat);

                  // Base styles by seat type
                  let typeBorderColor = 'border-slate-700';
                  let typeBg = 'bg-slate-800/80 hover:bg-slate-700';
                  let icon = null;

                  if (seat.type === 'vip') {
                    typeBorderColor = 'border-amber-500/50';
                    typeBg = 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300';
                  } else if (seat.type === 'couple') {
                    typeBorderColor = 'border-rose-500/50';
                    typeBg = 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-300';
                    icon = <Users className="w-3 h-3 opacity-60" />;
                  } else if (seat.type === 'accessible') {
                    typeBorderColor = 'border-sky-500/50';
                    typeBg = 'bg-sky-950/30 hover:bg-sky-900/40 text-sky-300';
                    icon = <Accessibility className="w-3 h-3 opacity-80" />;
                  }

                  // State overrides
                  if (isSold) {
                    typeBg = 'bg-slate-900/90 text-slate-600 border-slate-800 cursor-not-allowed';
                  } else if (isHeldByOther) {
                    typeBg = 'bg-amber-900/40 text-amber-500 border-amber-600/50 animate-pulse cursor-not-allowed';
                  } else if (isSelected) {
                    typeBg = 'bg-gradient-to-t from-teal-600 to-teal-400 text-slate-950 font-bold border-teal-300 shadow-lg shadow-teal-500/40 scale-105';
                  }

                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={isSold || isHeldByOther}
                      title={`${seat.id} (${seat.type.toUpperCase()}) - ${formatCurrency(price)}${
                        isSold ? ' - Sold' : isHeldByOther ? ' - Locked by another user' : ''
                      }`}
                      className={`relative w-7 h-7 sm:w-9 sm:h-9 rounded-t-lg rounded-b-md border text-[11px] font-medium flex flex-col items-center justify-center transition-all duration-150 group ${typeBg} ${typeBorderColor}`}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isHeldByOther ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <span>{seat.col}</span>
                      )}

                      {/* Tooltip on Hover */}
                      <span className="absolute bottom-full mb-1 hidden group-hover:block z-30 px-2 py-1 bg-slate-900 text-[10px] text-white rounded shadow-lg border border-slate-700 whitespace-nowrap pointer-events-none">
                        {seat.id} • {formatCurrency(price)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Row identifier right */}
              <div className="w-6 text-center text-xs font-bold text-slate-400">
                {rowLabel}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Seat Types */}
      <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-t bg-slate-800 border border-slate-700" />
          <span>{t('seats.available')} ({formatCurrency(showtime.priceTiers.standard)})</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-t bg-teal-500 border border-teal-300" />
          <span className="text-teal-400 font-semibold">{t('seats.selected')}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-t bg-amber-500/20 border border-amber-500/60" />
          <span className="text-amber-400">{t('seats.vip')} ({formatCurrency(showtime.priceTiers.vip)})</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-t bg-amber-900/40 border border-amber-600/50" />
          <span className="text-amber-500">{t('seats.held')}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-t bg-slate-900 border border-slate-800" />
          <span className="text-slate-600">{t('seats.sold')}</span>
        </div>
      </div>
    </div>
  );
};
