-- =================================================================
-- Maldivian Movie Ticketing Platform (PWA) - Database Schema
-- Compatible with Supabase / PostgreSQL 15+
-- =================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    branding JSONB NOT NULL DEFAULT '{}'::jsonb,
    owner_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HALLS TABLE (Multiple halls per tenant)
CREATE TABLE IF NOT EXISTS halls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    island VARCHAR(100) NOT NULL,
    atoll VARCHAR(50) NOT NULL,
    address TEXT,
    contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SCREENS TABLE (Multiple screens per hall with visual matrix)
CREATE TABLE IF NOT EXISTS screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    screen_name VARCHAR(150) NOT NULL,
    layout JSONB NOT NULL DEFAULT '{"rows": 8, "cols": 12, "seats": []}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MOVIES TABLE (Metadata in English and Dhivehi Thaana)
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    title_en VARCHAR(255) NOT NULL,
    title_dv VARCHAR(255) NOT NULL,
    synopsis_en TEXT,
    synopsis_dv TEXT,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT,
    duration_minutes INT NOT NULL DEFAULT 120,
    age_rating VARCHAR(10) NOT NULL DEFAULT 'PG-13',
    trailer_youtube_url TEXT,
    cast_members TEXT[] DEFAULT '{}',
    genres TEXT[] DEFAULT '{}',
    release_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SHOWTIMES TABLE
CREATE TABLE IF NOT EXISTS showtimes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    show_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_tiers JSONB NOT NULL DEFAULT '{"standard": 100, "vip": 150, "couple": 250, "accessible": 80}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_ref VARCHAR(50) UNIQUE NOT NULL,
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'bml_gateway' CHECK (payment_method IN ('bml_gateway', 'bml_transfer', 'mfaisaa', 'cash')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending_verification', 'expired', 'refunded')),
    slip_url TEXT,
    qr_code_hash VARCHAR(255) NOT NULL,
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BOOKING SEATS TABLE (Strict atomic double-booking prevention)
CREATE TABLE IF NOT EXISTS booking_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_id VARCHAR(50) NOT NULL,
    row_label VARCHAR(10) NOT NULL,
    col_index INT NOT NULL,
    seat_type VARCHAR(30) NOT NULL DEFAULT 'standard',
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- CRITICAL ANTI-DOUBLE-BOOKING CONSTRAINT: A seat in a showtime can only be booked once!
    CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_id)
);

-- 8. REAL-TIME SEAT HOLDS (10-minute lock table)
CREATE TABLE IF NOT EXISTS seat_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_seat_hold UNIQUE (showtime_id, seat_id)
);

-- 9. SYSTEM AUDIT & TRANSACTION LOGS
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_showtimes_date ON showtimes(show_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_qr ON bookings(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expiry ON seat_holds(expires_at);

-- =================================================================
-- ATOMIC STORED PROCEDURE: ACQUIRE SEAT HOLD (With 10-min countdown)
-- =================================================================
CREATE OR REPLACE FUNCTION acquire_seat_hold(
    p_showtime_id UUID,
    p_seat_id VARCHAR,
    p_session_id VARCHAR,
    p_hold_seconds INT DEFAULT 600
) RETURNS BOOLEAN AS $$
DECLARE
    v_already_booked BOOLEAN;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Check if seat already booked
    SELECT EXISTS (
        SELECT 1 FROM booking_seats 
        WHERE showtime_id = p_showtime_id AND seat_id = p_seat_id
    ) INTO v_already_booked;

    IF v_already_booked THEN
        RETURN FALSE;
    END IF;

    -- Clean up expired holds for this seat
    DELETE FROM seat_holds 
    WHERE showtime_id = p_showtime_id 
      AND seat_id = p_seat_id 
      AND expires_at < NOW();

    -- Try to insert seat hold
    v_expires_at := NOW() + (p_hold_seconds || ' seconds')::INTERVAL;
    
    INSERT INTO seat_holds (showtime_id, seat_id, session_id, expires_at)
    VALUES (p_showtime_id, p_seat_id, p_session_id, v_expires_at)
    ON CONFLICT (showtime_id, seat_id) 
    DO UPDATE SET expires_at = v_expires_at 
    WHERE seat_holds.session_id = p_session_id;

    RETURN TRUE;
EXCEPTION
    WHEN unique_violation THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Enable Supabase Realtime replication on seat_holds & booking_seats
ALTER PUBLICATION supabase_realtime ADD TABLE seat_holds;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_seats;
