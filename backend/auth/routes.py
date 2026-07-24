from fastapi import APIRouter, HTTPException, Depends, Request
from database.db import get_connection, release_connection
from auth.models import UserRegister, UserLogin, AuthResponse, UserResponse
from auth.utils import hash_password, verify_password, create_token, get_current_user
from auth.utils import generate_verification_code, send_verification_email
from datetime import datetime, timedelta
from pydantic import BaseModel
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_CODE_ATTEMPTS = 5

class VerifyRequest(BaseModel):
    code: str
    email: str | None = None

@router.post("/register", response_model=AuthResponse)
@limiter.limit("5/minute")
def register(user: UserRegister, request: Request):
    conn = get_connection()

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(user.password)
        code = generate_verification_code()
        expires = datetime.utcnow() + timedelta(minutes=15)

        cursor.execute(
            """INSERT INTO users (email, hashed_password, verification_code, verification_code_expires, verification_attempts)
            VALUES (%s, %s, %s, %s, 0) RETURNING id""",
            (user.email, hashed, code, expires)
            )

        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()

    finally:
        release_connection(conn)

    try:
        send_verification_email(user.email, code, email_type="verification")
    except Exception as e:
        print(f"Email delivery failed: {e}")
        print(f"\n==========================================")
        print(f"VERIFICATION CODE FOR {user.email}: {code}")
        print(f"==========================================\n")

    token = create_token(user_id)
    return AuthResponse(
        token=token,
        user=UserResponse(id=str(user_id), email=user.email)
    )

@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
def login(user: UserLogin, request: Request):
    conn = get_connection()

    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, hashed_password, is_verified FROM users WHERE email = %s",
            (user.email,)
            )
        row = cursor.fetchone()
        cursor.close()

    finally:
        release_connection(conn)

    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, row[1]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not row[2]:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    token = create_token(row[0])
    return AuthResponse(
        token=token,
        user=UserResponse(id=str(row[0]), email=user.email)
    )

@router.post("/verify")
@limiter.limit("10/minute")
def verify_email(req: VerifyRequest, request: Request):
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            from auth.utils import decode_token
            user_id = decode_token(token)
        except Exception:
            pass

    conn = get_connection()
    try:
        cursor = conn.cursor()
        if user_id:
            cursor.execute(
                "SELECT verification_code, verification_code_expires, is_verified, id, verification_attempts FROM users WHERE id = %s",
                (user_id,)
            )
        elif req.email:
            cursor.execute(
                "SELECT verification_code, verification_code_expires, is_verified, id, verification_attempts FROM users WHERE email = %s",
                (req.email,)
            )
        else:
            raise HTTPException(status_code=400, detail="Authorization token or email required")

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        stored_code, expires, is_verified, db_user_id, attempts = row

        if is_verified:
            return {"ok": True, "message": "Email already verified"}

        if attempts is not None and attempts >= MAX_CODE_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Please request a new code.")

        if not stored_code or datetime.utcnow() > expires:
            raise HTTPException(status_code=400, detail="Verification code expired")

        if req.code != stored_code:
            cursor.execute(
                "UPDATE users SET verification_attempts = COALESCE(verification_attempts, 0) + 1 WHERE id = %s",
                (db_user_id,)
            )
            conn.commit()
            raise HTTPException(status_code=400, detail="Invalid verification code")

        cursor.execute(
            "UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expires = NULL, verification_attempts = 0 WHERE id = %s",
            (db_user_id,)
        )
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)

    return {"ok": True, "message": "Email verified successfully"}

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(email: str, request: Request):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            # don't reveal if email exists or not
            return {"message": "If this email is registered, a reset code has been sent"}

        code = generate_verification_code()
        expires = datetime.utcnow() + timedelta(minutes=15)

        cursor.execute(
            "UPDATE users SET reset_code = %s, reset_code_expires = %s, reset_attempts = 0 WHERE email = %s",
            (code, expires, email)
        )
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)

    try:
        send_verification_email(email, code, email_type="reset")
    except Exception as e:
        print(f"Email error: {e}")

    return {"message": "If this email is registered, a reset code has been sent"}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(email: str, code: str, new_password: str, request: Request):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT reset_code, reset_code_expires, reset_attempts FROM users WHERE email = %s",
            (email,)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        stored_code, expires, attempts = row

        if not stored_code:
            raise HTTPException(status_code=400, detail="No reset code requested")

        if attempts is not None and attempts >= MAX_CODE_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Please request a new code.")

        if datetime.utcnow() > expires:
            raise HTTPException(status_code=400, detail="Reset code expired")

        if code != stored_code:
            cursor.execute(
                "UPDATE users SET reset_attempts = COALESCE(reset_attempts, 0) + 1 WHERE email = %s",
                (email,)
            )
            conn.commit()
            raise HTTPException(status_code=400, detail="Invalid reset code")

        hashed = hash_password(new_password)
        cursor.execute(
            "UPDATE users SET hashed_password = %s, reset_code = NULL, reset_code_expires = NULL, reset_attempts = 0 WHERE email = %s",
            (hashed, email)
        )
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)

    return {"message": "Password reset successfully"}