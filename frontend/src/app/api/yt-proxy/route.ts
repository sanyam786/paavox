export const runtime = "edge";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// YouTube's public InnerTube API key (embedded in YouTube's web player JS)
const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v");

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return Response.json({ error: "Invalid video ID" }, { status: 400 });
  }

  // Call the InnerTube /player API — returns structured JSON with captionTracks,
  // no HTML scraping, no consent cookies needed.
  const playerRes = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20231121.08.00",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
      },
      body: JSON.stringify({
        context: {
          client: {
            hl: "en",
            gl: "US",
            clientName: "WEB",
            clientVersion: "2.20231121.08.00",
          },
        },
        videoId,
      }),
    }
  );

  if (!playerRes.ok) {
    return Response.json(
      { error: `InnerTube API returned HTTP ${playerRes.status}` },
      { status: 502 }
    );
  }

  const playerData = await playerRes.json() as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: Array<{
          languageCode: string;
          kind?: string;
          baseUrl: string;
        }>;
      };
    };
  };

  const tracks =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    return Response.json(
      { error: "No captions available for this video" },
      { status: 404 }
    );
  }

  // Prefer auto-generated English (kind=asr), fall back to manual English
  const enTrack =
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind === "asr") ||
    tracks.find((t) => t.languageCode?.startsWith("en"));

  if (!enTrack) {
    const langs = tracks.map((t) => t.languageCode).join(", ");
    return Response.json(
      { error: `No English track found. Available: ${langs}` },
      { status: 404 }
    );
  }

  // Fetch the VTT subtitle file
  const vttRes = await fetch(`${enTrack.baseUrl}&fmt=vtt`);
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
