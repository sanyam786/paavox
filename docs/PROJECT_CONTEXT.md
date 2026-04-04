# Contiq — Full Project Context

> Paste this file into any new Claude Code session to give it complete project knowledge.
> Working directory: `/Users/sanyamlodha/Personal/Sanyam/Claude/content-agent-platform`

---

## 1. What This Project Is

**Contiq** (formerly ContentAI) is an AI-powered content creation SaaS platform for creators and brands. It automates the full content lifecycle: discover trends → create content → publish → analyse performance → grow audience.

The project is actively under development. It started as a 3-agent prototype (Caption, Repurposing, Trend) and has grown to 13+ agents.

---

## 2. Tech Stack

### Frontend
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth (UI) | Clerk (`@clerk/nextjs`) |
| HTTP client | Axios (`src/lib/apiClient.ts`) — auto-attaches Clerk JWT |
| Icons | Lucide React |
| Toast notifications | react-hot-toast |
| Dark mode | Custom ThemeProvider + localStorage |

Frontend runs on **port 3000**.

### Backend
| Layer | Choice |
|---|---|
| Framework | FastAPI (Python) |
| ASGI server | Uvicorn |
| Validation | Pydantic v2 |
| AI / LLM | Groq API — model `llama-3.3-70b-versatile` |
| Web search | Tavily API |
| Image generation | fal.ai (`fal-client`) + FLUX model fallback |
| Video generation | fal.ai (`fal-client`) |
| YouTube processing | `yt-dlp` + `ffmpeg` + `youtube-transcript-api` (v0.7.x) |
| Database | Supabase (PostgreSQL via `supabase-py`) |
| Auth (backend) | Clerk JWT verification via `PyJWT` + `PyJWKClient` |
| Social OAuth/posting | Per-platform OAuth2 flows |

Backend runs on **port 8000**.

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL database + Auth user sync |
| Clerk | User auth (sign-up, sign-in, session management) |
| Docker Compose | `docker-compose.yml` at project root — runs frontend + backend |
| Local filesystem | `backend/clips_data/` — stores YouTube Shorts clips (10-day TTL) |

---

## 3. Project Structure

```
content-agent-platform/
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   │   ├── layout.tsx          # Root layout (Clerk, ThemeProvider, Toaster)
│   │   │   ├── page.tsx            # Landing / redirect
│   │   │   ├── auth/sign-in/       # Clerk sign-in page
│   │   │   ├── dashboard/          # Dashboard (recent content, stats)
│   │   │   ├── agents/             # Agent hub + individual agent pages
│   │   │   │   ├── page.tsx        # Agent directory (4 groups)
│   │   │   │   ├── trends/         # Trend Agent
│   │   │   │   ├── competitor-analysis/  # Competitor Analysis Agent
│   │   │   │   ├── content-writer/ # Content Writer Agent
│   │   │   │   ├── caption/        # Caption Agent
│   │   │   │   ├── image-generator/# Image Generator Agent
│   │   │   │   ├── video/          # Video Creator Agent
│   │   │   │   ├── repurpose/      # Repurposing Agent + YouTube Shorts Clipper
│   │   │   │   ├── schedule/       # Schedule Agent
│   │   │   │   ├── analytics/      # Analytics Agent
│   │   │   │   ├── comment-reply/  # Comment Reply Agent
│   │   │   │   ├── influencer/     # Influencer Manager Agent
│   │   │   │   ├── collab/         # Collab & Outreach Agent
│   │   │   │   └── persona-builder/# Persona Builder Agent
│   │   │   ├── content/            # My Content library page
│   │   │   ├── settings/           # Brand settings page
│   │   │   ├── pipeline/           # Pipeline page
│   │   │   ├── calendar/           # Content calendar
│   │   │   ├── history/            # Agent run history
│   │   │   ├── trends/             # Trend browser
│   │   │   └── oauth/              # OAuth callback pages
│   │   ├── components/             # Shared components
│   │   └── lib/
│   │       ├── apiClient.ts        # Axios instance with Clerk JWT interceptor
│   │       └── useSettings.ts      # Brand settings hook
│   └── .env.local                  # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLERK_*
└── backend/
    ├── app/
    │   ├── main.py                 # FastAPI app, CORS, router mount
    │   ├── api/v1/
    │   │   ├── router.py           # Mounts all endpoint routers
    │   │   └── endpoints/
    │   │       ├── agents.py       # All agent endpoints
    │   │       ├── content.py      # Content library CRUD
    │   │       ├── users.py        # User profile
    │   │       ├── settings.py     # Brand settings
    │   │       ├── brands.py       # Brand management
    │   │       ├── social.py       # Social OAuth + posting
    │   │       ├── schedule.py     # Scheduling
    │   │       ├── analytics.py    # Analytics
    │   │       ├── comments.py     # Comment reply
    │   │       ├── influencer.py   # Influencer search
    │   │       ├── collab.py       # Collab outreach
    │   │       ├── upload.py       # File upload
    │   │       ├── pipeline.py     # Pipeline management
    │   │       └── notifications.py# Notifications
    │   ├── core/
    │   │   ├── config.py           # Settings (pydantic-settings, reads .env)
    │   │   ├── database.py         # Supabase client singleton
    │   │   ├── auth.py             # Clerk JWT verification + user upsert
    │   │   ├── anthropic_client.py # MISLEADING NAME — actually wraps Groq client
    │   │   └── clips_store.py      # YouTube Shorts clip file registry (10-day TTL)
    │   ├── schemas/
    │   │   ├── agents.py           # All agent request/response Pydantic models
    │   │   ├── settings.py         # Brand settings schema
    │   │   ├── social.py           # Social platform schemas
    │   │   ├── schedule.py         # Schedule schemas
    │   │   ├── pipeline.py         # Pipeline schemas
    │   │   └── brand.py            # Brand schemas
    │   └── services/
    │       ├── content_service.py  # DB helpers: save/get/delete content items
    │       ├── settings_service.py # Brand settings DB helpers
    │       ├── social_service.py   # Social OAuth token management
    │       ├── posting_service.py  # Platform-specific post publishing
    │       ├── analytics_service.py# Analytics data aggregation
    │       ├── schedule_service.py # Scheduling logic
    │       ├── pipeline_service.py # Pipeline orchestration
    │       ├── notification_service.py # Push notifications
    │       └── agents/
    │           ├── base.py         # BaseAgent: wraps Groq _chat() method
    │           ├── caption_agent.py
    │           ├── repurposing_agent.py
    │           ├── trend_agent.py
    │           ├── content_writer_agent.py
    │           ├── image_generator_agent.py
    │           ├── video_creator_agent.py
    │           ├── youtube_shorts_agent.py
    │           ├── competitor_analysis_agent.py
    │           ├── persona_builder_agent.py
    │           ├── schedule_agent.py
    │           ├── analytics_agent.py
    │           ├── comment_reply_agent.py
    │           ├── influencer_agent.py
    │           └── collab_agent.py
    ├── clips_data/                 # Runtime dir — YouTube Shorts MP4 files
    └── .env                        # All backend env vars
```

---

## 4. Authentication Flow

1. **Frontend**: Clerk handles sign-up/sign-in. `ClerkProvider` wraps the entire app.
2. **API calls**: `src/lib/apiClient.ts` — Axios instance with a request interceptor that calls `clerk.session.getToken()` and attaches `Authorization: Bearer <jwt>` on every request.
3. **Backend**: `app/core/auth.py` — `get_current_user_id()` dependency:
   - Verifies Clerk JWT using `PyJWKClient` (fetches JWKS from `CLERK_JWT_ISSUER/.well-known/jwks.json`)
   - Extracts `sub` claim as `user_id`
   - Upserts user into `users` table on first sight
   - Returns `user_id: str` — injected via `Depends(get_current_user_id)` in every protected endpoint
4. **Supabase**: Uses service role key (`SUPABASE_SERVICE_KEY`) — RLS policies for `content_items`, `agent_runs` etc. were disabled to allow inserts without full user sync. This is a dev shortcut.

---

## 5. LLM / AI Setup

**IMPORTANT GOTCHA**: `backend/app/core/anthropic_client.py` is misnamed — it wraps the **Groq** client, not Anthropic.

```python
# anthropic_client.py — actually Groq
from groq import Groq
_client = Groq(api_key=settings.ANTHROPIC_API_KEY)  # key name reused
```

- All agents extend `BaseAgent` which calls `self._chat(system, user, max_tokens)` → Groq API
- Model: `llama-3.3-70b-versatile`
- The env var is called `ANTHROPIC_API_KEY` but holds the **Groq API key**

---

## 6. Database Schema (Supabase / PostgreSQL)

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Clerk user ID (`user_xxx`) |
| `email` | text | From JWT claims |
| `first_name` | text | |
| `last_name` | text | |
| `created_at` | timestamptz | |

### `content_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | text | FK → users.id |
| `agent_run_id` | uuid | FK → agent_runs.id (nullable) |
| `platform` | text | instagram/twitter/linkedin/tiktok/youtube/facebook/general |
| `type` | text | caption/repurposed/written/image/video/youtube_short/trend-based |
| `content` | text | Main content (caption text, image URL, video URL, etc.) |
| `hashtags` | text[] | |
| `original_content` | text | Source content or JSON metadata |
| `created_at` | timestamptz | |

**Recommended index** (add if missing — prevents statement timeouts):
```sql
CREATE INDEX IF NOT EXISTS idx_content_items_user_created
ON content_items(user_id, created_at DESC);
```

### `agent_runs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | text | |
| `agent_type` | text | caption/repurpose/trend/content_writer/image_generator/video_creator/etc. |
| `status` | text | completed/failed |
| `input` | jsonb | Request payload |
| `output` | jsonb | Response data |
| `created_at` | timestamptz | |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | text | |
| `type` | text | e.g. `video_ready` |
| `title` | text | |
| `body` | text | |
| `link` | text | Frontend route |
| `read` | bool | |
| `created_at` | timestamptz | |

---

## 7. All Agents

### Agent Directory Groups (frontend: `/agents`)
1. **Discover**: Trend Agent, Competitor Analysis
2. **Create**: Content Writer, Caption, Image Generator, Video Creator, Repurposing (+ YouTube Shorts Clipper)
3. **Publish & Analyse**: Schedule, Analytics, Comment Reply
4. **Grow**: Influencer Manager, Collab & Outreach

---

### 7.1 Trend Agent
- **Frontend**: `/agents/trends`
- **Endpoint**: `POST /api/v1/agents/trends`
- **Schema**:
  ```python
  TrendRequest:
    niche: str
    platforms: list[Platform] | None
    timeframe: "24h" | "7d" | "30d"
    brand_voice: str
    bio: str
    location: str
    include_viral: bool = False      # mix cross-niche viral moments
    location_scope: str = "brand"   # "brand" | "global"

  TrendResponse:
    trends: list[TrendTopic]
    niche: str

  TrendTopic:
    topic: str
    score: float         # 0.0–10.0
    platforms: list[Platform]
    content_ideas: list[str]
    hashtags: list[str]
    trend_type: str      # "niche" | "viral"
  ```
- **How it works**: 1–2 Tavily searches (niche + optionally viral), Claude generates structured trend list. When `include_viral=True`, a second Tavily search for cross-niche viral moments is done and Claude is asked to include ≥2 `type: "viral"` trends.
- **UI features**: Viral toggle (orange, Flame icon), location scope segmented control (brand location vs Global). Viral trends show 🔥 badge and orange card ring.

---

### 7.2 Competitor Analysis Agent
- **Frontend**: `/agents/competitor-analysis`
- **Endpoint**: `POST /api/v1/agents/competitor-analysis`
- **Schema**:
  ```python
  CompetitorAnalysisRequest:
    competitor_name: str
    platforms: list[str] | None
    niche: str
    brand_voice: str
    bio: str
    location: str

  CompetitorAnalysisResponse:
    competitor_name: str
    competitor_overview: str
    competitor_niche: str
    their_content_strategy: list[str]
    their_strengths: list[str]
    their_weaknesses: list[str]
    content_gaps: list[GapItem]     # priority: "high"|"medium"|"low"
    your_advantages: list[str]
    recommendations: list[str]

  GapItem:
    gap: str
    opportunity: str
    priority: str
  ```
- **How it works**: 3 Tavily searches (general strategy, content/platform activity, audience/positioning) combined into one research block → Claude generates gap analysis comparing competitor vs user's brand context.
- **UI**: Overview card, 3-column grid (Strategy/Strengths/Weaknesses), Content Gaps accordion sorted High→Medium→Low, Advantages + Recommendations 2-column grid.

---

### 7.3 Content Writer Agent
- **Frontend**: `/agents/content-writer`
- **Endpoint**: `POST /api/v1/agents/content-writer`
- **Formats**: tiktok_script, reels_script, youtube_script, tweet_thread, linkedin_post, blog_post, carousel, newsletter
- **Auto-saves** to `content_items` with `type="written"`

---

### 7.4 Caption Agent
- **Frontend**: `/agents/caption`
- **Endpoint**: `POST /api/v1/agents/caption`
- **Platforms**: instagram, twitter, linkedin, tiktok, youtube, facebook
- **Auto-saves** to `content_items` with `type="caption"`

---

### 7.5 Image Generator Agent
- **Frontend**: `/agents/image-generator`
- **Endpoint**: `POST /api/v1/agents/image-generator`
- **Uses**: fal.ai with FLUX model
- **Styles**: photorealistic, illustration, 3D render, minimalist, cinematic, anime
- **Sizes**: platform-optimised (square, portrait, landscape)
- **Auto-saves** to `content_items` with `type="image"`, stores image URL

---

### 7.6 Video Creator Agent
- **Frontend**: `/agents/video`
- **Endpoint**: `POST /api/v1/agents/video`
- **Uses**: fal.ai for short-form AI video
- **Aspect ratios**: 9:16 (Reels/TikTok/Shorts), 1:1 (Instagram), 16:9 (YouTube)
- **Duration**: 5 or 10 seconds
- **Styles**: cinematic, vlog, educational, promotional, storytelling
- **Auto-saves** to `content_items` with `type="video"`, stores video URL
- **On success**: creates notification via `notification_service`

---

### 7.7 Repurposing Agent + YouTube Shorts Clipper
- **Frontend**: `/agents/repurpose` — **single page with mode toggle**: Repurpose | YouTube Shorts Clipper
- **Repurpose endpoint**: `POST /api/v1/agents/repurpose` → returns repurposed content, user reviews before saving via `POST /api/v1/agents/repurpose/save`
- **YouTube Shorts endpoints**:
  - `POST /api/v1/agents/youtube-shorts/analyze` — downloads transcript, Claude picks best moments → returns `ViralMoment[]`
  - `POST /api/v1/agents/youtube-shorts/clip` — yt-dlp downloads video, ffmpeg clips + crops → saves to `backend/clips_data/`, returns `public_url`
  - `GET /api/v1/agents/youtube-shorts/serve/{clip_id}` — **public, no auth** — streams MP4 file (UUID is capability token)
  - `GET /api/v1/agents/youtube-shorts/download/{clip_id}` — auth required, streams file then deletes it
- **Transcript API quirk**: `youtube-transcript-api` v0.7.x changed API — must use instance-based: `YouTubeTranscriptApi().fetch(video_id)` not `YouTubeTranscriptApi.get_transcript()`
- **Clips storage**: `backend/clips_data/` (local filesystem), 10-day TTL. `clips_store.py` rebuilds in-memory registry from disk on server startup.
- **Clips saved to content library**: `type="youtube_short"`, `content` = public serve URL, `original_content` = JSON `{title, source_url, duration}`. Auto-deleted after 10 days via `cleanup_expired_shorts()`.

---

### 7.8 Schedule Agent
- **Frontend**: `/agents/schedule`
- **Endpoint**: `POST /api/v1/agents/...` (via schedule endpoints)
- Provides AI-optimised posting time recommendations per platform

---

### 7.9 Analytics Agent
- **Frontend**: `/agents/analytics`
- Analyses content performance, provides AI-driven strategy recommendations

---

### 7.10 Comment Reply Agent
- **Frontend**: `/agents/comment-reply`
- **Endpoint**: `POST /api/v1/comments/...`
- Generates on-brand replies to comments across platforms

---

### 7.11 Influencer Manager
- **Frontend**: `/agents/influencer`
- **Endpoint**: `POST /api/v1/influencer/...`
- Finds ideal influencer collaborators, generates personalised outreach DMs

---

### 7.12 Collab & Outreach Agent
- **Frontend**: `/agents/collab`
- **Endpoint**: `POST /api/v1/collab/...`
- Finds collaboration partners, generates personalised outreach messages

---

### 7.13 Persona Builder Agent
- **Frontend**: `/agents/persona-builder`
- **Endpoint**: `POST /api/v1/agents/persona-builder`
- Builds detailed audience persona: demographics, psychographics, pain points, day-in-life narrative

---

## 8. My Content Library (`/content`)

- Fetches from `GET /api/v1/content/` with optional `platform` and `type` filters
- Tabs: All, Captions, Written, Images, Videos, Repurposed, Trend-Based, YT Shorts
- `type` values and rendering:
  - `caption` → text display
  - `written` → text display
  - `image` → `<img>` tag, content is URL
  - `video` → `<video>` player, content is URL
  - `youtube_short` → `<video>` player (red "YT Short" badge), shows duration + source URL + "⏳ Auto-deleted after 10 days" warning
  - `trend-based` → text display
  - `repurposed` → text display
- Delete: `DELETE /api/v1/content/{id}` — for `youtube_short` items also deletes the clip file from disk
- Error handling: `r.data?.items ?? []` (defensive — prevents crash if API fails)
- Limit: 50 items per fetch to avoid statement timeouts

---

## 9. Brand Settings (`/settings`)

Stored in Supabase. Used by agents to personalise output. Fields:
- `niche` — content niche/industry
- `bio` — brand bio
- `brand_voice` — tone description
- `location` — brand location (used for location-scoped trend searches)
- `platforms` — active social platforms
- Social OAuth tokens (Twitter, Instagram, LinkedIn, Facebook, YouTube)

The `useSettings` hook fetches settings from `GET /api/v1/settings/` and many agent pages pre-fill their forms from it.

---

## 10. Social Posting

- OAuth2 flows per platform — frontend redirects to `/oauth/success` or `/oauth/error` after callback
- Posting via `posting_service.py`:
  - Twitter/X: Twitter API v2
  - Instagram: Meta Graph API (image/video posts)
  - LinkedIn: LinkedIn API v2
  - Facebook: Facebook Graph API
  - YouTube: YouTube Data API v3
  - TikTok: TikTok API

---

## 11. Notifications

- Created server-side via `notification_service.create_notification(user_id, type, title, body, link)`
- Currently triggered by video generation completing
- Frontend polls `GET /api/v1/notifications/` and shows unread count in nav

---

## 12. Pipeline (`/pipeline`)

Multi-step automated content workflows — chain multiple agents together. Each pipeline run is tracked in `agent_runs`.

---

## 13. Environment Variables

### Backend (`.env`)
```
ANTHROPIC_API_KEY=       # ACTUALLY the Groq API key
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER=        # e.g. https://clerk.your-domain.com
TAVILY_API_KEY=
FAL_KEY=                 # fal.ai — image/video generation
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=["http://localhost:3000"]
# Social OAuth (all optional for dev):
TWITTER_CLIENT_ID=, TWITTER_CLIENT_SECRET=
INSTAGRAM_CLIENT_ID=, INSTAGRAM_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=, LINKEDIN_CLIENT_SECRET=
FACEBOOK_APP_ID=, FACEBOOK_APP_SECRET=
FACEBOOK_PAGES_APP_ID=, FACEBOOK_PAGES_APP_SECRET=
GOOGLE_CLIENT_ID=, GOOGLE_CLIENT_SECRET=
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

---

## 14. How to Run

```bash
# Option 1 — Docker Compose (both services)
docker compose up

# Option 2 — Manual
# Terminal 1 (backend)
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 (frontend)
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs (Swagger UI)
- Health check: `GET http://localhost:8000/health`

---

## 15. Key Gotchas & Design Decisions

1. **`anthropic_client.py` wraps Groq, not Anthropic** — the variable name and file name are misleading. The actual LLM is `llama-3.3-70b-versatile` via Groq. The env var `ANTHROPIC_API_KEY` holds the Groq key.

2. **Supabase RLS is disabled** — `content_items`, `agent_runs` tables have RLS disabled or permissive policies. Service role key is used throughout. This is an intentional dev shortcut.

3. **YouTube Shorts clips are local-only** — Supabase Storage was abandoned due to persistent RLS issues. Clips live in `backend/clips_data/`, served via `GET /api/v1/agents/youtube-shorts/serve/{clip_id}` (no auth). UUID is the capability token.

4. **`youtube-transcript-api` v0.7.x API change** — must use `YouTubeTranscriptApi().fetch(video_id)` (instance method), not the old class method `YouTubeTranscriptApi.get_transcript()`.

5. **Content library limit is 50** — `get_all_content()` uses `.limit(50)` to avoid Supabase statement timeouts. Add composite index for performance: `CREATE INDEX IF NOT EXISTS idx_content_items_user_created ON content_items(user_id, created_at DESC);`

6. **App name is "Contiq"** — set in `frontend/src/app/layout.tsx` metadata title.

7. **`BaseAgent._chat()`** calls `self.client.chat.completions.create()` — same interface as OpenAI SDK, because Groq's Python SDK is OpenAI-compatible.

8. **`content_service.delete_content_item()`** — for `youtube_short` items, extracts `clip_id` from the serve URL and deletes the file from disk before deleting the DB row.

9. **`cleanup_expired_shorts(user_id)`** — called after every successful clip generation. Deletes DB rows + disk files older than 10 days.

10. **Agent pages auto-fill from brand settings** — most agent pages call `useSettings()` on mount and pre-fill `niche`, `brand_voice`, `location`, `bio` fields from the user's saved brand profile.
