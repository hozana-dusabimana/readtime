-- ReadyTime database schema.
-- The app runs this file every time it starts. "IF NOT EXISTS" means it is
-- safe to run again: existing tables and data are left alone.
-- All dates/times are Africa/Kigali local time (no time zone stored).

-- Needed for the "no overlapping appointments" rule at the bottom.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS businesses (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    address     VARCHAR(200) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(200) NOT NULL,
    role           VARCHAR(20)  NOT NULL
                   CHECK (role IN ('CLIENT', 'PROVIDER', 'BUSINESS_ADMIN', 'SYSTEM_ADMIN')),
    business_id    INT REFERENCES businesses(id),   -- only for PROVIDER and BUSINESS_ADMIN
    no_show_count  INT NOT NULL DEFAULT 0,
    blocked        BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE after 3 no-shows
    active         BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = account disabled by system admin
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id                SERIAL PRIMARY KEY,
    provider_id       INT NOT NULL REFERENCES users(id),
    name              VARCHAR(100) NOT NULL,
    duration_minutes  INT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 480),
    price             NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    active            BOOLEAN NOT NULL DEFAULT TRUE
);

-- One row = one working period. Two rows on the same day = a break between them.
-- day_of_week: 1 = Monday ... 7 = Sunday
CREATE TABLE IF NOT EXISTS working_hours (
    id           SERIAL PRIMARY KEY,
    provider_id  INT NOT NULL REFERENCES users(id),
    day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS appointments (
    id           SERIAL PRIMARY KEY,
    client_id    INT NOT NULL REFERENCES users(id),
    provider_id  INT NOT NULL REFERENCES users(id),
    service_id   INT NOT NULL REFERENCES services(id),
    start_at     TIMESTAMP NOT NULL,
    end_at       TIMESTAMP NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'BOOKED'
                 CHECK (status IN ('BOOKED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (start_at < end_at)
);

-- Safety net against double-booking: the database itself refuses two BOOKED
-- appointments for the same provider whose time ranges overlap.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings') THEN
        ALTER TABLE appointments ADD CONSTRAINT no_overlapping_bookings
            EXCLUDE USING gist (provider_id WITH =, tsrange(start_at, end_at) WITH &&)
            WHERE (status = 'BOOKED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
    token       VARCHAR(100) PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMP NOT NULL
);
