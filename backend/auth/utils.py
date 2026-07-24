import bcrypt
from jose import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import random
import string
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

def get_current_user(credentials = Depends(security)):
    try:
        token = credentials.credentials
        user_id = decode_token(token)
        return user_id
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> int:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return int(payload["sub"])

def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(email: str, code: str, email_type: str = "verification"):
    if email_type == "verification":
        subject = "Verify your email"
        heading = "Email Verification"
        message = "Use this code to verify your email address."
        color = "#7B337E"
    else:
        subject = "Reset your password"
        heading = "Password Reset"
        message = "Use this code to reset your password. If you didn't request this, ignore this email."
        color = "#6667AB"

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = os.getenv("GMAIL_USER")
    msg['To'] = email

    html = f"""
        <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; 
                    background: #210635; padding: 40px; border-radius: 16px;">
            <h2 style="color: #F5D5E0; margin-bottom: 8px;">{heading}</h2>
            <p style="color: #F5D5E0; opacity: 0.8;">{message}</p>
            <div style="background: #420D4B; border-radius: 12px; padding: 24px; 
                        text-align: center; margin: 24px 0;">
                <p style="color: #F5D5E0; margin: 0 0 8px 0; font-size: 14px;">Your code:</p>
                <h1 style="letter-spacing: 12px; color: {color}; font-size: 36px; margin: 0;">
                    {code}
                </h1>
            </div>
            <p style="color: #F5D5E0; opacity: 0.6; font-size: 12px;">
                This code expires in 15 minutes.
            </p>
        </div>
    """

    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(
                os.getenv("GMAIL_USER"),
                os.getenv("GMAIL_APP_PASSWORD")
            )
            server.sendmail(os.getenv("GMAIL_USER"), email, msg.as_string())
    except Exception as e:
        print(f"Email error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")