-- Emergency reset for migration tracking
-- This migration runs first (000) and clears corrupted migration state

-- Check if users table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'users'
    ) THEN
        -- Users table doesn't exist, but migrations might be recorded
        -- Clear all migration tracking to start fresh
        RAISE NOTICE 'Users table not found - resetting migration tracking';
        TRUNCATE TABLE schema_migrations;
    ELSE
        RAISE NOTICE 'Users table exists - migration tracking is valid';
    END IF;
END $$;
