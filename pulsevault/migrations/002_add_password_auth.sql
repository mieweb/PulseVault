-- Add password_hash column to user table for local authentication
-- This migration adds support for email/password authentication alongside OAuth

-- Check if password_hash column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE "user" ADD COLUMN password_hash VARCHAR(255);
        
        -- Add comment
        COMMENT ON COLUMN "user".password_hash IS 'Bcrypt hashed password for local authentication';
    END IF;
END $$;

-- Create index on email for faster login queries
CREATE INDEX IF NOT EXISTS idx_user_email_login ON "user"(email) WHERE password_hash IS NOT NULL;

-- Sample user insertion (for testing)
-- Password: "password123" (hashed with bcrypt cost factor 12)
-- Uncomment to create test user:
/*
INSERT INTO "user" (id, email, password_hash, name, "emailVerified", role, banned, created_at, updated_at)
VALUES (
    'test-user-' || gen_random_uuid()::text,
    'test@pulsevault.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aqaF6OW.3MZO', -- password123
    'Test User',
    false,
    'user',
    false,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;
*/

COMMENT ON TABLE "user" IS 'User accounts with support for OAuth and local authentication';
