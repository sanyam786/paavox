from app.core.database import get_db
from datetime import datetime, timezone, timedelta
from collections import Counter


def _parse_dt(s: str | None) -> datetime | None:
    """Parse any Supabase timestamp string into a UTC-aware datetime."""
    if not s:
        return None
    try:
        import re
        s = s.strip()
        # Strip timezone suffix entirely (+00, +00:00, -05:30, Z) — Supabase is always UTC
        s = re.sub(r'(\+|-)\d{2}:?\d{0,2}$', '', s).rstrip('Z').strip()
        s = s.replace(' ', 'T')
        # Try with microseconds, then without
        for fmt in ('%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None
    except Exception:
        return None


def _week_buckets(items: list[dict], date_field: str, n: int = 8) -> list[dict]:
    now = datetime.now(tz=timezone.utc)
    buckets = []
    for i in range(n - 1, -1, -1):
        week_start = now - timedelta(weeks=i + 1)
        week_end   = now - timedelta(weeks=i)
        try:
            label = week_end.strftime("%-d %b")
        except ValueError:
            label = week_end.strftime("%d %b")
        count = sum(
            1 for item in items
            if (dt := _parse_dt(item.get(date_field))) and week_start <= dt < week_end
        )
        buckets.append({"week": label, "count": count})
    return buckets


def get_overview_stats(user_id: str) -> dict:
    db = get_db()

    content_items = db.table("content_items").select("id,platform,type,created_at").eq("user_id", user_id).execute().data or []
    queue_items   = db.table("post_queue").select("id,platform,status,scheduled_at,posted_at,media_url").eq("user_id", user_id).execute().data or []
    agent_runs    = db.table("agent_runs").select("id,agent_type,created_at,input").eq("user_id", user_id).execute().data or []

    posted    = [q for q in queue_items if q["status"] == "posted"]
    scheduled = [q for q in queue_items if q["status"] == "scheduled"]

    # Platform breakdown — content generated
    platform_counts: dict[str, int] = {}
    for item in content_items:
        p = item.get("platform") or "unknown"
        platform_counts[p] = platform_counts.get(p, 0) + 1

    # Platform breakdown — content posted
    posted_platform_counts: dict[str, int] = {}
    for item in posted:
        p = item.get("platform") or "unknown"
        posted_platform_counts[p] = posted_platform_counts.get(p, 0) + 1

    # Posted: with vs without image
    posts_with_image = sum(1 for p in posted if p.get("media_url"))
    posts_text_only  = len(posted) - posts_with_image

    # Agent usage breakdown
    agent_counts: dict[str, int] = {}
    for run in agent_runs:
        a = run.get("agent_type") or "unknown"
        agent_counts[a] = agent_counts.get(a, 0) + 1

    # Weekly activity — content created
    weekly_created = _week_buckets(content_items, "created_at")

    # Weekly activity — content posted (fall back to now for records missing posted_at)
    now_iso = datetime.now(tz=timezone.utc).isoformat()
    for p in posted:
        if not p.get("posted_at"):
            p["posted_at"] = now_iso
    weekly_posted = _week_buckets(posted, "posted_at")


    # Influencer agent stats
    influencer_runs = [r for r in agent_runs if r.get("agent_type") == "influencer"]
    influencer_niches    = Counter(r["input"].get("niche", "") for r in influencer_runs if r.get("input")).most_common(5)
    influencer_platforms = Counter(r["input"].get("platform", "") for r in influencer_runs if r.get("input")).most_common(5)
    influencer_stats = {
        "total_runs": len(influencer_runs),
        "top_niches":    [{"niche": n, "count": c} for n, c in influencer_niches if n],
        "top_platforms": [{"platform": p, "count": c} for p, c in influencer_platforms if p],
    }

    # Collab agent stats
    collab_runs = [r for r in agent_runs if r.get("agent_type") == "collab"]
    collab_types     = Counter(r["input"].get("collab_type", "") for r in collab_runs if r.get("input")).most_common(5)
    collab_platforms = Counter(r["input"].get("platform", "") for r in collab_runs if r.get("input")).most_common(5)
    collab_niches    = Counter(r["input"].get("niche", "") for r in collab_runs if r.get("input")).most_common(5)
    collab_stats = {
        "total_runs":    len(collab_runs),
        "top_collab_types": [{"type": t, "count": c} for t, c in collab_types if t],
        "top_platforms":    [{"platform": p, "count": c} for p, c in collab_platforms if p],
        "top_niches":       [{"niche": n, "count": c} for n, c in collab_niches if n],
    }

    return {
        "total_content":      len(content_items),
        "total_scheduled":    len(scheduled),
        "total_posted":       len(posted),
        "total_agent_runs":   len(agent_runs),
        "platform_breakdown": platform_counts,
        "posted_platform_breakdown": posted_platform_counts,
        "posts_with_image":   posts_with_image,
        "posts_text_only":    posts_text_only,
        "agent_breakdown":    agent_counts,
        "weekly_activity":    weekly_created,
        "weekly_posted":      weekly_posted,
        "influencer_stats":   influencer_stats,
        "collab_stats":       collab_stats,
    }


def get_content_sample(user_id: str, limit: int = 20) -> list[dict]:
    db = get_db()
    return (
        db.table("content_items")
        .select("platform,type,content,hashtags,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data or []
    )
