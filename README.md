# Content Agent Platform

AI-powered content creation platform with 3 specialized agents.

## Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python 3.11
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI**: Anthropic Claude API
- **Storage**: Cloudinary
- **Payments**: Stripe

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase project. Password: @supabase@123
https://btqcaqcbbhumspdqdivc.supabase.co
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWNhcWNiYmh1bXNwZHFkaXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ0NjIsImV4cCI6MjA4ODU0MDQ2Mn0.b8zZBPsBg0qV0W5d1855fhuw6ObJbYCQ7MHwsJPLyDE
- Clerk account
- Anthropic API key

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Project Structure
```
content-agent-platform/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # App Router pages
│       ├── components/ # React components
│       ├── lib/       # Utilities, API client
│       └── types/     # TypeScript types
└── backend/           # FastAPI app
    └── app/
        ├── api/       # Route handlers
        ├── core/      # Config, DB, auth
        ├── models/    # SQLAlchemy models
        ├── schemas/   # Pydantic schemas
        └── services/  # Business logic + agents
```
