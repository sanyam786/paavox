export const runtime = "edge";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v");

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return Response.json({ error: "Invalid video ID" }, { status: 400 });
  }

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytRes = await fetch(ytUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const html = await ytRes.text();
  return new Response(html, {
    status: ytRes.status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
