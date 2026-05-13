# GTU ExamAI — Application Context

## Purpose

GTU ExamAI is an AI-powered exam preparation platform built specifically for students of Gujarat Technological University (GTU). It helps students predict likely exam questions, get AI-generated model answers, access study materials, and collaborate with peers — all tailored to GTU's exam structure and syllabus.

## Target Users

- **Students (BE and Diploma):** Browse predictions, study with the AI tutor, upload and access materials, participate in community rooms, track coins and streaks.
- **Admins:** Approve/reject content, manage users, create daily challenges and coupons, view platform analytics.

## High-Level Feature Set

| Feature | Student-Facing Name | Description |
|---|---|---|
| Exam Predictions | Andaza Laga | Bayesian ML-scored question predictions per subject |
| AI Chat Tutor | Pooch Lo | RAG-backed conversational AI tutor per subject |
| Exam Brief | Brahmastra | Aggregated prediction brief with shareable public link |
| Study Materials | Materials | Upload and browse approved notes, textbooks, handwritten material |
| Question Bank | Question Bank | Browse all extracted questions from past GTU papers |
| Model Answers | Answers | LLM-generated answers cached against question patterns |
| Community Rooms | Community | Anonymous encrypted real-time chat rooms for study groups |
| Coin System | Coins | Gamification currency: earned by activity, spent on AI features |
| Daily Challenges | Daily Challenge | Admin-created MCQ quiz, one per day, earns coins |
| Login Streaks | Streaks | Consecutive daily login tracking with freeze power-up |
| Coupons | Coupons | Admin-issued promo codes for coin bonuses |
| Diagrams | (inline) | Auto-generated diagrams (Mermaid/Graphviz/ASCII) for visual questions |
| Admin Panel | Admin | Full management interface: approvals, analytics, user tools |

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router, TypeScript, React 18)
- **Styling:** Tailwind CSS with a custom design system
- **Component Library:** shadcn/ui (Radix-based primitives)
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Notifications:** Sonner (toast library)
- **Auth Client:** @supabase/auth-helpers-nextjs
- **Real-time:** Native WebSocket API (community chat)

### Backend
- **Framework:** FastAPI (Python 3.10, async)
- **Auth Validation:** Supabase JWT (JWKS verification)
- **Rate Limiting:** SlowAPI
- **LLM:** Groq (Llama 3.3-70B, primary) → Google Gemini (fallback)
- **Embeddings:** Sentence Transformers (BAAI/bge-small-en-v1.5, 384-dim, locally hosted)
- **Vector DB Client:** Qdrant Python SDK
- **PDF Extraction:** PyMuPDF
- **Email:** Resend
- **Error Tracking:** Sentry (optional)

### Infrastructure
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth)
- **File Storage:** Supabase Storage (buckets: question-papers, study-materials)
- **Vector DB:** Qdrant (collections: gtu_questions, gtu_study_materials)
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Railway

## Architecture Overview

The system follows a three-tier architecture:

1. **Frontend (Next.js on Vercel):** Handles UI, routing, and Supabase session management. Communicates with the backend via a typed `api.ts` fetch wrapper that injects the Supabase JWT into every request. For real-time community chat, it maintains a WebSocket connection directly to the backend.

2. **Backend (FastAPI on Railway):** The main business logic layer. Validates JWTs from Supabase, queries the PostgreSQL database via the Supabase client, calls LLM APIs (Groq/Gemini) for AI features, and performs semantic search against Qdrant. Long-running jobs (PDF processing, material embedding) are handled as FastAPI background tasks.

3. **Data Layer:**
   - **Supabase PostgreSQL:** All structured application data (users, papers, questions, patterns, materials, sessions, coins, community rooms, etc.)
   - **Supabase Storage:** Binary files (PDFs for papers and materials)
   - **Qdrant:** Vector embeddings of questions and study material chunks, used for semantic retrieval in chat and answer generation

## Authentication Flow

1. User signs in via Supabase Auth (email/password). Supabase returns a JWT access token and refresh token.
2. The frontend Next.js middleware reads the session cookie on every request and redirects unauthenticated users to `/login`.
3. All API requests from the frontend include the JWT in the `Authorization: Bearer` header.
4. The backend validates the JWT signature against Supabase's public JWKS endpoint and checks if the user is suspended in the database.
5. Admin routes additionally verify `user_metadata.role == "admin"` or that the email is in the configured admin list.

## Data Flow: Core AI Features

### Exam Predictions (Andaza)
1. Admin or student uploads a past GTU question paper (PDF).
2. Background worker extracts questions via PDF parsing, generates embeddings, clusters similar questions into `question_patterns`, and scores each pattern using five Bayesian signals.
3. Student requests predictions for a subject. The backend returns scored patterns from the DB (or triggers fresh generation), plus web-scraped supplementary analysis.
4. Brahmastra assembles these predictions into a tiered brief (Certain / Likely / Watch), generates an LLM professor-voice summary, and caches the result for 24 hours.

### AI Chat Tutor (Pooch Lo)
1. Student sends a message in a chat session for a specific subject.
2. Backend embeds the message and queries Qdrant for relevant study material chunks and past questions for that subject.
3. The retrieved context plus the last 20 messages of conversation history are sent to Groq (with Gemini as fallback) for a streaming response.
4. Tokens stream back to the frontend via Server-Sent Events (SSE). Sources and follow-up suggestions are injected at the end of the stream.

### Model Answers
1. When a student requests a model answer for a predicted question, the backend checks the `answers` cache table.
2. If cached and fresh, it returns the stored answer immediately.
3. If not cached, it calls the LLM (with GTU answer format guidelines) and stores the result for future requests.
4. Concurrent requests for the same pattern are coalesced — only one LLM call fires, and all waiting requests receive the same result.

## Key Naming Conventions

- **Andaza Laga:** The exam predictions feature (Hindi: "make a guess")
- **Pooch Lo:** The AI chat tutor (Hindi: "ask it")
- **Brahmastra:** The premium exam brief feature (named after the mythological ultimate weapon)
- **Oracle:** Backend name for the Brahmastra engine
- **question_patterns:** Normalized clusters of similar questions across years, the central unit of prediction logic
- **prediction_score:** 0–100 Bayesian score assigned to each pattern
- **Tiers:** HIGH / MEDIUM / LOW (predictions), Certain / Likely / Watch (Brahmastra brief)
- **program:** Refers to degree type: BE (Bachelor of Engineering) or DIPLOMA

## Coin Economy

Coins are the platform's internal gamification currency:
- **Earning:** Daily login (+10), correct daily challenge (+15), challenge attempt (+5), streak milestones, admin grants, coupon redemption.
- **Spending:** AI query beyond free daily limit (−10 per query), streak freeze power-up (−50).
- Every coin movement is recorded in `coin_transactions` for auditing.

## Privacy & Security Notes

- Community chat messages are encrypted client-side with AES-256-GCM before transmission. The server stores only ciphertext and initialization vectors; it cannot read message content.
- Users in community rooms appear under randomly assigned pseudonyms, not their real names.
- Supabase Row-Level Security (RLS) is relied upon for data isolation between users.
- Admin-only routes are double-gated: backend middleware rejects non-admins regardless of frontend routing.

## Module Reference

Detailed per-module documentation lives in:
- `frontend/docs/` — All frontend modules (pages, components, hooks, utilities)
- `backend/docs/` — All backend modules (routers, services, workers, database)
