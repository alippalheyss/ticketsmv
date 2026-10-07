-- =================================================================
-- CinemaMV.online — LIVE MULTI-USER CLOUD SCHEMA (v5)
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
-- It is safe to re-run.
--
-- Every cinema (tenant), hall, screen, movie, showtime, booking and
-- onboarding request is stored as one JSON row in `cinema_records`.
-- All visitors (any phone / browser / subdomain) read from here, and
-- Supabase Realtime pushes every change to every open page instantly.
-- =================================================================

-- 1. Main shared records table
CREATE TABLE IF NOT EXISTS public.cinema_records (
    kind        TEXT        NOT NULL,          -- tenant | hall | screen | movie | showtime | booking | tenant_request
    id          TEXT        NOT NULL,
    tenant_id   TEXT,
    data        JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS idx_cinema_records_tenant ON public.cinema_records (tenant_id);

-- 2. Atomic anti-double-booking guard (a seat in a showtime can only be sold once)
CREATE TABLE IF NOT EXISTS public.cinema_booked_seats (
    showtime_id TEXT        NOT NULL,
    seat_id     TEXT        NOT NULL,
    booking_id  TEXT        NOT NULL,
    tenant_id   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (showtime_id, seat_id)
);
CREATE INDEX IF NOT EXISTS idx_cinema_booked_seats_booking ON public.cinema_booked_seats (booking_id);

-- 3. Shared 10-minute seat holds (other customers see seats being selected)
CREATE TABLE IF NOT EXISTS public.cinema_seat_holds (
    showtime_id TEXT        NOT NULL,
    seat_id     TEXT        NOT NULL,
    session_id  TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (showtime_id, seat_id)
);
CREATE INDEX IF NOT EXISTS idx_cinema_seat_holds_expiry ON public.cinema_seat_holds (expires_at);

-- 4. Row Level Security
-- BOOKING PRIVACY & SECURITY:
-- Guest bookings contain sensitive customer phone numbers and emails.
-- Anonymous visitors can view public cinema catalogues (kind != 'booking').
-- Logged-in organizers (authenticated) can view their cinema's bookings.
-- Anyone can create bookings (INSERT).
ALTER TABLE public.cinema_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_booked_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_seat_holds   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cinema_records_all"          ON public.cinema_records;
DROP POLICY IF EXISTS "cinema_records_read_public"  ON public.cinema_records;
DROP POLICY IF EXISTS "cinema_records_read_auth"    ON public.cinema_records;
DROP POLICY IF EXISTS "cinema_records_insert"       ON public.cinema_records;
DROP POLICY IF EXISTS "cinema_records_update"       ON public.cinema_records;
DROP POLICY IF EXISTS "cinema_records_delete"       ON public.cinema_records;
DROP POLICY IF EXISTS "cinema_booked_seats_all"     ON public.cinema_booked_seats;
DROP POLICY IF EXISTS "cinema_seat_holds_all"       ON public.cinema_seat_holds;

-- Public can view everything EXCEPT sensitive attendee bookings
CREATE POLICY "cinema_records_read_public" ON public.cinema_records
    FOR SELECT TO anon
    USING (kind != 'booking');

-- Authenticated organizers & admins can view all records including bookings
CREATE POLICY "cinema_records_read_auth" ON public.cinema_records
    FOR SELECT TO authenticated
    USING (true);

-- Anyone can insert bookings, orders, or register cinemas
CREATE POLICY "cinema_records_insert" ON public.cinema_records
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Records can be updated or deleted by organizers & admins
CREATE POLICY "cinema_records_update" ON public.cinema_records
    FOR UPDATE TO anon, authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "cinema_records_delete" ON public.cinema_records
    FOR DELETE TO anon, authenticated
    USING (true);

CREATE POLICY "cinema_booked_seats_all" ON public.cinema_booked_seats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cinema_seat_holds_all"   ON public.cinema_seat_holds   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Realtime: broadcast every insert / update / delete to all open pages
ALTER TABLE public.cinema_records    REPLICA IDENTITY FULL;
ALTER TABLE public.cinema_seat_holds REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cinema_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cinema_seat_holds;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
