export const runtime = "edge";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

type CaptionTrack = {
  languageCode: string;
  kind?: string;
  baseUrl: string;
};

type PlayerResponse = {
  playabilityStatus?: { status: string; reason?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
  };
};

async function callInnerTube(videoId: string, client: object): Promise<PlayerResponse> {
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, context: { client } }),
    }
  );
  if (!res.ok) return {};
  return res.json();
}

// Clients in priority order — ANDROID_TESTSUITE works server-side without auth
const CLIENTS = [
  { clientName: "ANDROID_TESTSUITE", clientVersion: "1.9", hl: "en", gl: "US" },
  { clientName: "ANDROID", clientVersion: "19.09.37", androidSdkVersion: 30, hl: "en", gl: "US" },
  { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0", hl: "en", gl: "US" },
  { clientName: "WEB", clientVersion: "2.20231121.08.00", hl: "en", gl: "US" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v");

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return Response.json({ error: "Invalid video ID" }, { status: 400 });
  }

  let tracks: CaptionTrack[] | undefined;
  let lastStatus = "UNKNOWN";
  let lastReason = "";

  for (const client of CLIENTS) {
    const data = await callInnerTube(videoId, client);
    lastStatus = data.playabilityStatus?.status ?? "UNKNOWN";
    lastReason = data.playabilityStatus?.reason ?? "";
    tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) break;
  }

  if (!tracks || tracks.length === 0) {
    return Response.json(
      { error: `No captions available. status=${lastStatus} reason=${lastReason}` },
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
      { error: `No English track. Available: ${langs}` },
      { status: 404 }
    );
  }

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
