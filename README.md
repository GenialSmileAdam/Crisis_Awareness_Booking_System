# Crisis Awareness Booking Management System

**Psychology Unit MVP – Nile University of Nigeria Buildathon 2026**

## Overview

A centralized web-based counseling management platform that enables students to book counseling sessions (with crisis priority flagging), allows counselors to document sessions with AI-assisted audio transcription and summarization, and generates longitudinal progress reports. Includes family engagement features for parent/guardian involvement.

## Problem Solved

The Psychology Unit currently operates without any digital system. Scheduling is manual, session notes are disconnected, crisis cases have no priority pathway, and counselors spend most of their time on administrative work instead of student care.

## Key Features

- Student profiles auto-generated from school database CSV
- Calendar booking with two-way Google Calendar sync
- Crisis priority flag – bypasses queue, triggers immediate alert
- Session documentation with audio recording and file upload
- AI transcription (Whisper) + AI summary and insights (GPT-4o)
- Progress reports (PDF export) with sentiment tracking
- Family engagement management (invitations, consent-based sharing)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js + Tailwind CSS |
| Backend | Python / FastAPI |
| Database | PostgreSQL (Supabase) |
| File Storage | Supabase Storage |
| AI/ML | OpenAI Whisper + GPT-4o |
| Calendar | Google Calendar API (two-way sync) |
| Hosting | Railway (backend) + Vercel (frontend) |
| Version Control | GitHub |

## Team

| Role | Name |
|------|------|
| Team Leader / Product | Jason Oladipo Hughes |
| Frontend Developer | Akinpelu Oluwafemi-David |
| Backend Developer | Sodiq Abdulwaris |
| Backend Developer | Ridwan Olateju |
| Data/AI Engineer | Daniel Olugbule |
| UI/UX Designer | Odosa Enarureo |

## Development Milestones

- **Week 1:** Core MVP – auth, student profiles, basic booking with crisis flag
- **Week 2:** Workflow Enhancement – Google Calendar sync, notifications, session forms, family engagement
- **Week 3:** AI & Analytics – Whisper transcription, GPT-4o summaries, progress reports, analytics dashboard
- **Week 4:** Refinement & Demo – UI polish, bug fixes, end-to-end testing, stakeholder demo

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL (or Supabase account)
- OpenAI API key
- Google Calendar OAuth credentials

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # add your API keys
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # add backend URL
npm run dev
```

### Environment Variables Required
- `DATABASE_URL` – PostgreSQL connection string
- `SUPABASE_URL` + `SUPABASE_KEY` – for file storage
- `OPENAI_API_KEY` – GPT-4o and Whisper
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` – Calendar API
- `TWILIO_SID` + `TWILIO_AUTH_TOKEN` – SMS alerts

## Deployment

- Backend: Railway (connected to GitHub)
- Frontend: Vercel (connected to GitHub)

## License

Academic project – Nile University of Nigeria Buildathon 2026
