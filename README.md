# Zen — Chat With Your Documents, Intelligently

Zen is a multi-user RAG (Retrieval-Augmented Generation) document chatbot. Upload documents, ask questions, and get answers grounded in your own files with page-level citations — powered by hybrid retrieval and **Corrective RAG (CRAG)** retrieval grading to reduce hallucination on bad or irrelevant context.

This project was built as a portfolio piece to go beyond a basic LLM wrapper — it includes real multi-user auth, retrieval quality engineering (CRAG, hybrid search), and multi-format document handling. It's not a hardened production system (see [Known Limitations](#known-limitations)), but the architecture is built the way a real system would be structured.

📄 **[Read the debugging & evaluation log](./EVALUATION.md)** — a detailed account of the bugs found and fixed while building the retrieval pipeline, verified against ground-truth answers rather than assumed.

---

## Contents

- [Why this project is different](#why-this-project-is-different)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Known limitations](#known-limitations)
- [Project structure](#project-structure)
- [Security](#security)
- [Roadmap](#roadmap)

---

## Why this project is different

Most portfolio RAG projects stop at "embed documents, do vector search, generate an answer." Zen goes a step further with **Corrective RAG (CRAG)**: before any answer is generated, every retrieved chunk is independently graded for relevance by a lightweight LLM. If nothing relevant is found, the system rewrites the query and retries once before honestly telling the user it couldn't find an answer — instead of confidently hallucinating on irrelevant context.

This matters because plain vector search retrieves *something* for almost any query, whether or not that something is actually relevant. CRAG is the layer that catches that failure mode before it reaches the user.

---

## Features

- **Hybrid retrieval** — combines dense vector search (ChromaDB) with BM25 keyword search for stronger recall than either alone
- **Corrective RAG (CRAG) retrieval grading** — every retrieved chunk is graded `relevant` / `ambiguous` / `irrelevant` before generation; on a full miss, the query is rewritten and retried once before falling back to an honest "not found" response
- **Multi-format document ingestion** — PDF, DOCX, PPTX, XLSX, CSV, TXT, and Markdown, each with dedicated parsing (table extraction, slide/sheet-aware chunking, and heading-aware section tagging for PDFs)
- **Page-level citations** — every answer is grounded with the exact page, slide, or sheet it came from
- **Conversational memory with query rewriting** — follow-up questions ("what about X instead?") are rewritten into standalone questions using conversation history before retrieval
- **Streaming responses** — answers stream token-by-token over Server-Sent Events
- **Multi-user support** — JWT authentication, per-user document isolation, email verification, and password reset, all backed by PostgreSQL
- **Brute-force protection** — rate limiting on all auth endpoints and attempt limits on verification/reset codes
- **Document management** — upload, rename, delete, and select documents, with automatic summary generation on upload

---

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend   │─────▶│   FastAPI     │─────▶│   PostgreSQL     │
│  (Next.js)   │◀─────│   Backend     │◀─────│   (Supabase)     │
└─────────────┘      └──────┬───────┘      └─────────────────┘
                             │
                 ┌───────────┴────────────┐
                 │                        │
          ┌──────▼──────┐         ┌───────▼───────┐
          │  ChromaDB    │         │  Groq (Llama)  │
          │ (hybrid      │         │  - Generation   │
          │  vector +    │         │  - CRAG grading │
          │  BM25 store) │         │  - Query        │
          └─────────────┘         │    rewriting    │
                                   └────────────────┘
```

### Retrieval pipeline (CRAG flow)

1. User asks a question → if there's conversation history, it's rewritten into a standalone question
2. Hybrid search (dense + BM25) retrieves the top-k candidate chunks
3. Each chunk is graded `relevant` / `ambiguous` / `irrelevant` by a fast, cheap model
4. If any chunk is relevant → proceed to generation with only the relevant chunks
5. If nothing is relevant → the query is rewritten once and retried
6. If the retry also finds nothing relevant → the user gets an honest "no relevant information found" response instead of a hallucinated answer

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | Next.js (React), Tailwind CSS |
| Vector store | ChromaDB (hybrid dense + BM25 via `rank_bm25`) |
| LLM orchestration | LangChain |
| Generation model | `llama-3.3-70b-versatile` (via Groq) |
| Grading / query rewriting model | `llama-3.1-8b-instant` (via Groq) |
| Database | PostgreSQL (Supabase) |
| Auth | JWT, bcrypt password hashing |
| Email | Gmail SMTP (verification & password reset) |
| Document parsing | `pdfplumber`, `python-docx`, `python-pptx`, `openpyxl` |

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A PostgreSQL database (e.g. a free [Supabase](https://supabase.com) project)
- A [Groq](https://console.groq.com) API key
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) (for email verification/reset — requires 2-Step Verification enabled)

### Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt --break-system-packages
```

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `SECRET_KEY` | Random secret for JWT signing — generate with `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))` in PowerShell |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) |
| `GMAIL_USER` | Gmail address used to send verification/reset emails |
| `GMAIL_APP_PASSWORD` | 16-character Gmail App Password (not your regular password) |

Apply the database schema before first run — see [`schema.sql`](./schema.sql), which mirrors the `init_db()` function in `backend/database/db.py`. Run it against your PostgreSQL database (e.g. via Supabase's SQL Editor) manually; the backend does not create these tables automatically.

Start the backend:

```bash
uvicorn main:app --reload --port 8080
```

The API will be available at `http://localhost:8080`, with interactive docs at `http://localhost:8080/docs`.

### Frontend setup

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Confirm it points to your running backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Start the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

> **Note:** if you change either `.env` file while a dev server is already running, you must restart that server — environment variables are only read at process startup.

---

## Usage

1. Register an account (check your backend console if the verification email doesn't arrive — the code is printed there as a fallback)
2. Upload a document (PDF, DOCX, PPTX, XLSX, CSV, TXT, or MD — up to 10MB)
3. Select the document and start asking questions
4. Each answer includes citations showing exactly where the information came from

---

## Known limitations

Being upfront about these rather than hiding them:

- **Aggregation queries over tabular data** (e.g. "what's the most expensive item across all rows," "how many total items does X supply") are unreliable — chunk-based retrieval sees slices of a table, not the whole dataset, so exact aggregation isn't guaranteed. A more robust fix would route detected tabular/aggregation queries to a structured tool (e.g. pandas or SQL) instead of the vector store.
- **Compound-condition questions** (e.g. "what are person X's tasks in week Y" where no such combination exists in the source) can occasionally retrieve topically-related-but-incorrect chunks (e.g. person X's tasks from a different week) rather than confidently returning "not found." Prompt-level mitigations are in place, but this remains a known edge case of chunk-based retrieval rather than something fully solved.
- **No reranking, RAGAS evaluation, or GraphRAG** in the current version — these were considered and deliberately deferred; CRAG was prioritized as the stronger, less commonly implemented differentiator for a portfolio-scale project.
- Conversation history is currently stored in a local JSON file (`conversation_history.json`), not the database — fine for local/demo use, but wouldn't survive a serverless or multi-instance deployment.

---

## Project structure

```
ai-engg/
├── backend/
│   ├── auth/            # Registration, login, verification, password reset
│   ├── documents/        # Upload, list, select, delete, rename
│   ├── rag/
│   │   ├── text_loader.py       # Per-format document parsing (PDF/DOCX/PPTX/XLSX/CSV/TXT/MD)
│   │   ├── chunker.py           # Text splitting
│   │   ├── vector_store.py      # ChromaDB + hybrid (dense + BM25) search
│   │   ├── retrieval_grader.py  # CRAG grading and branching logic
│   │   └── rag.py               # Query rewriting, generation, streaming
│   ├── database/         # PostgreSQL connection pooling
│   ├── rate_limit.py      # Shared slowapi limiter instance
│   └── main.py
├── .github/workflows/
│   └── ci.yml             # Runs the CRAG test suite on every push
├── schema.sql             # Database schema — run manually before first launch
├── EVALUATION.md          # Debugging & testing write-up
└── frontend/
    ├── app/               # Next.js pages
    ├── components/        # UI components
    └── lib/               # API client, types
```

---

## Security

**Implemented:**
- Passwords hashed with bcrypt; JWT-based session auth
- Rate limiting on all auth endpoints (register, login, verify, forgot-password, reset-password)
- Attempt limits on verification and reset codes (max 5 wrong guesses before requiring a new code)
- Parameterized SQL throughout — no string-formatted queries
- Path/filename sanitization on document rename (rejects path separators, requires a supported extension)
- Per-user document isolation, enforced at both the database and vector-store level
- CORS restricted to known origins, not wildcarded
- `.env` gitignored; `.env.example` provided with placeholders only

**Deliberately out of scope** for a portfolio project run locally / cloned from GitHub rather than publicly deployed:
- No WAF, dependency vulnerability scanning, or secrets rotation policy
- Swagger docs (`/docs`) are enabled by default — fine for local use; gate behind an environment check before any public deployment

If you fork this project, rotate any keys before pushing to a public repository.

---

## Roadmap

Deliberately deferred, not overlooked:

- Route detected tabular-aggregation queries to a structured tool (pandas/SQL) instead of the vector store
- RAGAS-based retrieval evaluation
- Optional reranking layer
- GraphRAG (knowledge-graph-augmented retrieval) for multi-hop/relational queries
- Persist conversation history in PostgreSQL instead of a local JSON file, to support multi-instance/serverless deployment
