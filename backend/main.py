from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from database.db import init_db, init_pool, release_connection
from auth.routes import router as auth_router
from documents.routes import router as documents_router
from chat.routes import router as chat_router
from rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

app = FastAPI(title="RAG API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://your-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

init_pool()
init_db()
print("Database connected")

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)

@app.get("/")
def home():
    return {"message": "RAG API is running"}