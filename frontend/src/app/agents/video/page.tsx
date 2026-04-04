'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Download, ChevronDown, ChevronUp,
  Video, Clapperboard, Clock, Library,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const STYLES = [
  { value: 'cinematic',    label: 'Cinematic',    icon: '🎬', desc: 'Dramatic, film-quality look' },
  { value: 'vlog',         label: 'Vlog',         icon: '📱', desc: 'Casual & authentic' },
  { value: 'educational',  label: 'Educational',  icon: '💡', desc: 'Clean & professional' },
  { value: 'promotional',  label: 'Promotional',  icon: '🚀', desc: 'High-energy, commercial' },
  { value: 'storytelling', label: 'Storytelling', icon: '📖', desc: 'Narrative & emotional' },
];

const RATIOS = [
  { value: '9:16', label: 'Reels / TikTok', icon: '📱', size: '1080×1920' },
  { value: '1:1',  label: 'Square Feed',    icon: '⬛', size: '1080×1080' },
  { value: '16:9', label: 'YouTube',        icon: '🖥️', size: '1920×1080' },
];

const DURATIONS = [
  { value: 5,  label: '5 sec',  desc: 'Quick reel' },
  { value: 10, label: '10 sec', desc: 'Full story' },
];

interface VideoScene {
  scene_number: number;
  visual_description: string;
  text_overlay: string;
  spoken_words: string;
}

interface VideoResult {
  video_url: string;
  cover_image_url: string;
  video_error: string;
  script: string;
  scenes: VideoScene[];
  prompt_used: string;
  duration: number;
  aspect_ratio: string;
}

export default function VideoCreatorPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const router = useRouter();

  const [topic, setTopic]           = useState('');
  const [contentBody, setContentBody] = useState('');
  const [style, setStyle]           = useState('cinematic');
  const [ratio, setRatio]           = useState('9:16');
  const [duration, setDuration]     = useState(5);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<VideoResult | null>(null);
  const [error, setError]           = useState('');
  const [showScript, setShowScript] = useState(false);
  const [showScenes, setShowScenes] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [downloading, setDownloading] = useState(false);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setShowScript(false);
    setShowScenes(false);
    setElapsed(0);

    // elapsed timer
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);

    try {
      const { data } = await apiClient.post(
        '/api/v1/agents/video',
        {
          topic,
          content_body: contentBody || undefined,
          style,
          aspect_ratio: ratio,
          duration,
          niche:       settings.niche       || undefined,
          brand_voice: settings.brand_voice || undefined,
          location:    settings.location    || undefined,
        },
        { timeout: 360_000 },   // 6-minute axios timeout
      );
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Video generation failed. Please try again.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  async function downloadVideo(url: string) {
    setDownloading(true);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reel-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setDownloading(false);
    }
  }

  function downloadCover(url: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-${Date.now()}.jpg`;
    a.click();
  }

  const selectedRatio = RATIOS.find(r => r.value === ratio);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl">
          🎬
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Creator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate short-form videos for Reels, TikTok, and YouTube Shorts
          </p>
        </div>
        {settingsLoaded && (settings.niche || settings.location) && (
          <span className="text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
            ✓ Brand settings applied
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* ── LEFT: Controls ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Topic */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Video topic <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. 5 morning habits that changed my life"
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Existing content <span className="text-gray-400 font-normal">(optional — paste script, blog post, etc.)</span>
              </label>
              <textarea
                value={contentBody}
                onChange={e => setContentBody(e.target.value)}
                placeholder="Paste your existing content here and the AI will turn it into a video..."
                rows={4}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Style */}
          <div className="card p-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Style</label>
            <div className="space-y-2">
              {STYLES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    style === s.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${style === s.value ? 'text-brand-700 dark:text-brand-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ratio + Duration */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aspect ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setRatio(r.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-center transition-colors ${
                      ratio === r.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base">{r.icon}</span>
                    <span className="text-xs font-medium">{r.value}</span>
                    <span className="text-[10px] text-gray-400">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      duration === d.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {d.label}
                    <span className="text-xs font-normal text-gray-400">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating… {elapsed > 0 && <span className="text-white/70 text-xs">{elapsed}s</span>}
              </>
            ) : (
              <>
                <Clapperboard className="w-4 h-4" />
                Generate Video
              </>
            )}
          </button>

          {loading && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              {elapsed < 60
                ? 'Trying fast model (~30s)…'
                : elapsed < 150
                ? 'Fast model slow, trying high-quality model…'
                : 'Rendering with Kling AI (~3 min total)…'}
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* ── RIGHT: Result ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="card p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Video className="w-12 h-12 text-violet-200 dark:text-violet-800 mb-4" />
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your video will appear here</p>
              <p className="text-sm text-gray-400 max-w-xs">
                Enter a topic, pick your style and format, then click Generate Video.
              </p>
            </div>
          )}

          {loading && (
            <div className="card p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-brand-100 dark:border-brand-900 border-t-brand-500 rounded-full animate-spin" />
                <Clapperboard className="w-6 h-6 text-brand-500 absolute inset-0 m-auto" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Generating your video…</p>
              <p className="text-sm text-gray-400 mb-2">
                {elapsed < 10
                  ? 'Writing storyboard…'
                  : elapsed < 60
                  ? 'Rendering with LTX Video (fast model)…'
                  : elapsed < 150
                  ? 'Switching to Kling AI (higher quality)…'
                  : 'Rendering with Kling AI…'}
              </p>
              {elapsed > 0 && (
                <p className="text-xs text-gray-300 dark:text-gray-600">{elapsed}s elapsed</p>
              )}
            </div>
          )}

          {result && (
            <>
              {/* Video player or cover image */}
              <div className="card overflow-hidden">
                {result.video_url ? (
                  <div className="bg-black">
                    <video
                      src={result.video_url}
                      controls
                      autoPlay
                      loop
                      className={`w-full ${ratio === '9:16' ? 'max-h-[600px] object-contain' : ''}`}
                    />
                  </div>
                ) : result.cover_image_url ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.cover_image_url}
                      alt="Video cover"
                      className={`w-full ${ratio === '9:16' ? 'max-h-[600px] object-contain bg-black' : 'object-cover'}`}
                    />
                    {result.video_error && (
                      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Video generation failed — cover image shown instead</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 font-mono break-all">{result.video_error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-400">
                    <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Video URL not available — storyboard generated below.</p>
                  </div>
                )}

                {/* Download bar */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {result.duration}s
                  </span>
                  <span className="text-xs text-gray-400">{selectedRatio?.label}</span>
                  <div className="flex-1" />
                  {result.video_url && (
                    <button
                      onClick={() => router.push('/content')}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Library className="w-3.5 h-3.5" /> View in My Content
                    </button>
                  )}
                  {result.video_url && (
                    <button
                      onClick={() => downloadVideo(result.video_url)}
                      disabled={downloading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
                    >
                      {downloading
                        ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Downloading…</>
                        : <><Download className="w-3.5 h-3.5" /> Download MP4</>
                      }
                    </button>
                  )}
                  {result.cover_image_url && (
                    <button
                      onClick={() => downloadCover(result.cover_image_url)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Cover image
                    </button>
                  )}
                </div>
              </div>

              {/* Script */}
              {result.script && (
                <div className="card overflow-hidden">
                  <button
                    onClick={() => setShowScript(s => !s)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">📝 Script / Narration</span>
                    {showScript ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {showScript && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {result.script}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Scenes breakdown */}
              {result.scenes.length > 0 && (
                <div className="card overflow-hidden">
                  <button
                    onClick={() => setShowScenes(s => !s)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      🎬 Scene Breakdown ({result.scenes.length} scenes)
                    </span>
                    {showScenes ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {showScenes && (
                    <div className="px-4 pb-4 space-y-3">
                      {result.scenes.map(scene => (
                        <div
                          key={scene.scene_number}
                          className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 space-y-2"
                        >
                          <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                            Scene {scene.scene_number}
                          </p>
                          {scene.visual_description && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Visual</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{scene.visual_description}</p>
                            </div>
                          )}
                          {scene.text_overlay && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">On-screen text</p>
                              <span className="inline-block text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 rounded font-medium">
                                {scene.text_overlay}
                              </span>
                            </div>
                          )}
                          {scene.spoken_words && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Spoken</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{scene.spoken_words}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Prompt used */}
              <div className="card overflow-hidden">
                <button
                  onClick={() => setShowPrompt(s => !s)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">🔍 Prompt used</span>
                  {showPrompt ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showPrompt && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono leading-relaxed">
                      {result.prompt_used}
                    </p>
                  </div>
                )}
              </div>

              {/* Regenerate */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Regenerate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
