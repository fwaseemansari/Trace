-- Zen database schema
-- Run this against your PostgreSQL database (e.g. via Supabase's SQL Editor)
-- before starting the backend for the first time.
--
-- This mirrors init_db() in backend/database/db.py. The backend does not
-- run this automatically — apply it manually first.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code TEXT,
    verification_code_expires TIMESTAMP,
    verification_attempts INTEGER DEFAULT 0,
    reset_code TEXT,
    reset_code_expires TIMESTAMP,
    reset_attempts INTEGER DEFAULT 0,
    selected_document TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    summary TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
