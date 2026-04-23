export const runtime = "edge";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v");

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return Response.json({ error: "Invalid video ID" }, { status: 400 });
  }

  // Fetch YouTube watch page with consent cookies so we get the full player response
  const ytRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      // Bypass YouTube consent/cookie wall
      Cookie: "CONSENT=YES+cb; SOCS=CAE=",
    },
  });

  if (!ytRes.ok) {
    return Response.json(
      { error: `YouTube returned HTTP ${ytRes.status}` },
      { status: 502 }
    );
  }

  const html = await ytRes.text();

  // Extract captionTracks array from the embedded ytInitialPlayerResponse JSON
  const match = html.match(/"captionTracks":(\[[\s\S]*?\])/);
  if (!match) {
    // Return a small snippet so the backend can log what the page actually was
    const snippet = html.slice(0, 300).replace(/\n/g, " ");
    return Response.json(
      { error: "No captionTracks in page", snippet },
      { status: 404 }
    );
  }

  let tracks: Array<{ languageCode: string; kind?: string; baseUrl: string }>;
  try {
    tracks = JSON.parse(match[1]);
  } catch {
    return Response.json({ error: "Failed to parse captionTracks JSON" }, { status: 500 });
  }

  // Prefer auto-generated English (kind=asr), fall back to manual English
  const enTrack =
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind === "asr") ||
    tracks.find((t) => t.languageCode?.startsWith("en"));

  if (!enTrack) {
    const langs = tracks.map((t) => t.languageCode).join(", ");
    return Response.json(
      { error: `No English caption track. Available: ${langs}` },
      { status: 404 }
    );
  }

  // Fetch the VTT subtitle file
  const vttRes = await fetch(enTrack.baseUrl + "&fmt=vtt");
  if (!vttRes.ok) {
    return Response.json(
      { error: `Caption file returned HTTP ${vttRes.status}` },
      { status: 502 }
    );
  }

  const vtt = await vttRes.text();
  return new Response(vtt, {
    headers: { "Content-Type": "text/vtt; charset=utf-8" },
  });
}
