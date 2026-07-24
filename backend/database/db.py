import psycopg2
from psycopg2 import pool
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

connection_pool = None

def init_pool():
    global connection_pool
    connection_pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=DATABASE_URL,
        connect_timeout=3
    )

def get_connection():
    return connection_pool.getconn()

def release_connection(conn):
    connection_pool.putconn(conn)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            is_verified BOOLEAN DEFAULT FALSE,
            verification_code TEXT,
            verification_code_expires TIMESTAMP,
            reset_code TEXT,
            reset_code_expires TIMESTAMP,
            selected_document TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            summary TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cursor.close()
    release_connection(conn)