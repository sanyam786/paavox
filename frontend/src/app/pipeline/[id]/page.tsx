'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, Loader2, Sparkles, ChevronRight,
  Search, ArrowLeft, Image as ImageIcon, Type, Upload,
  X, ChevronLeft, Download, Video, Clapperboard, Bell,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface Pipeline {
  id: string;
  name: string;
  status: 'in_progress' | 'completed';
  current_step: number;
  topic: string;
  content_format: string;
  content_body: string;
  caption: string;
  hashtags: string[];
  image_url: string;
  video_url: string;
  video_status: string;   // none | generating | ready | failed
  platform: string;
  scheduled_time: string;
  posted: boolean;
}

// Video formats that get a video step instead of image
const VIDEO_FORMATS = ['tiktok_script', 'reels_script', 'youtube_script'];
const FORMAT_ASPECT: Record<string, string> = {
  tiktok_script: '9:16', reels_script: '9:16', youtube_script: '16:9',
};

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Topic',           icon: '🔍', desc: 'What to create about' },
  { label: 'Content',         icon: '✏️', desc: 'Write your content' },
  { label: 'Caption & Image', icon: '🎨', desc: 'Generate caption and visual' },
  { label: 'Review',          icon: '🚀', desc: 'Review and complete' },
];

const FORMATS = [
  { value: 'tiktok_script',  label: 'TikTok Script',  icon: '🎵' },
  { value: 'reels_script',   label: 'Reels Script',   icon: '📱' },
  { value: 'youtube_script', label: 'YouTube Script', icon: '▶️' },
  { value: 'tweet_thread',   label: 'Tweet Thread',   icon: '🧵' },
  { value: 'linkedin_post',  label: 'LinkedIn Post',  icon: '💼' },
  { value: 'blog_post',      label: 'Blog Post',      icon: '📝' },
  { value: 'carousel',       label: 'Carousel',       icon: '🎠' },
  { value: 'newsletter',     label: 'Newsletter',     icon: '📧' },
];

const TONES = ['engaging', 'professional', 'casual', 'funny', 'inspirational', 'educational'];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'twitter',   label: 'Twitter / X', icon: '🐦' },
  { value: 'linkedin',  label: 'LinkedIn', icon: '💼' },
  { value: 'tiktok',    label: 'TikTok', icon: '🎵' },
  { value: 'youtube',   label: 'YouTube', icon: '▶️' },
  { value: 'facebook',  label: 'Facebook', icon: '👥' },
];

const IMAGE_STYLES = [
  'photorealistic', 'digital art', 'illustration', 'minimalist', 'cinematic', 'cartoon',
];

// ── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current, status }: { current: number; status: string }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const done = status === 'completed' || i < current;
        const active = i === current && status === 'in_progress';
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                done
                  ? 'bg-green-500 text-white'
                  : active
                  ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/40'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <span>{step.icon}</span>}
              </div>
              <p className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                active ? 'text-brand-600 dark:text-brand-400' : done ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-600'
              }`}>{step.label}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 0: Topic ──────────────────────────────────────────────────────────

function Step0Topic({
  pipeline, onContinue,
}: {
  pipeline: Pipeline;
  onContinue: (updates: Partial<Pipeline>) => Promise<void>;
}) {
  const [topic, setTopic] = useState(pipeline.topic || '');
  const [discovering, setDiscovering] = useState(false);
  const [trends, setTrends] = useState<{ topic: string; content_ideas: string[] }[]>([]);
  const [saving, setSaving] = useState(false);

  async function discoverTrends() {
    setDiscovering(true);
    setTrends([]);
    try {
      const { data } = await apiClient.post('/api/v1/agents/trends', {
        niche: '',
        timeframe: '7d',
      });
      setTrends(data.trends?.slice(0, 5) ?? []);
    } catch {
      toast.error('Could not fetch trends. Type your topic manually.');
    } finally {
      setDiscovering(false);
    }
  }

  async function handleContinue() {
    if (!topic.trim()) return;
    setSaving(true);
    await onContinue({
      topic: topic.trim(),
      name: topic.trim().length > 50 ? topic.trim().slice(0, 50) + '…' : topic.trim(),
      current_step: 1,
    });
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">What do you want to create content about?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Type your topic or discover what's trending in your niche.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 5 ways to save money every month"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <button
            onClick={discoverTrends}
            disabled={discovering}
            className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5"
          >
            {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Discover trending topics
          </button>
        </div>
      </div>

      {/* Trend results */}
      {trends.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Trending now — click to select</p>
          <div className="space-y-2">
            {trends.map((t, i) => (
              <button
                key={i}
                onClick={() => setTopic(t.topic)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  topic === t.topic
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <p className={`text-sm font-medium mb-1 ${topic === t.topic ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  📈 {t.topic}
                </p>
                {t.content_ideas?.[0] && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.content_ideas[0]}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!topic.trim() || saving}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue to Content Writer <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Step 1: Content Writer ─────────────────────────────────────────────────

function Step1Content({
  pipeline, onContinue, onBack,
}: {
  pipeline: Pipeline;
  onContinue: (updates: Partial<Pipeline>) => Promise<void>;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const [format, setFormat] = useState(pipeline.content_format || 'tiktok_script');
  const [tone, setTone] = useState('engaging');
  const unwrapContent = (raw: string): string => {
    if (!raw?.trim().startsWith('{')) return raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed.body || parsed.content || parsed.text ||
          Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 20).join('\n\n') || raw;
      }
    } catch { /* invalid JSON — try string extraction */ }
    const bodyKey = raw.indexOf('"body":');
    if (bodyKey !== -1) {
      const openQ = raw.indexOf('"', bodyKey + 7);
      if (openQ !== -1) {
        const closeB = raw.lastIndexOf('}');
        const closeQ = raw.lastIndexOf('"', closeB - 1);
        if (closeQ > openQ) {
          return raw.slice(openQ + 1, closeQ)
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t');
        }
      }
    }
    return raw;
  };
  const [content, setContent] = useState(unwrapContent(pipeline.content_body || ''));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const { data } = await apiClient.post('/api/v1/agents/content-writer', {
        topic: pipeline.topic,
        content_format: format,
        tone,
        brand_voice: settings.brand_voice || undefined,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
      });
      setContent(data.body ?? '');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleContinue() {
    if (!content.trim()) return;
    setSaving(true);
    await onContinue({ content_format: format, content_body: content, current_step: 2 });
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      {/* Topic banner */}
      <div className="card p-4 bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800">
        <p className="text-xs text-brand-500 dark:text-brand-400 font-semibold uppercase tracking-wide mb-0.5">Topic</p>
        <p className="text-sm font-medium text-brand-800 dark:text-brand-200">{pipeline.topic}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* Left: controls */}
        <div className="space-y-4">
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content format</label>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                    format === f.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span>{f.icon}</span> {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tone</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TONES.map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`py-1.5 px-2 rounded-lg text-xs border capitalize transition-colors ${
                    tone === t
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {content ? 'Regenerate' : 'Generate content'}
          </button>
        </div>

        {/* Right: output */}
        <div className="card p-5">
          {generating ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Writing your content…</p>
            </div>
          ) : content ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Generated content</p>
                <p className="text-xs text-gray-400">You can edit this directly</p>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={16}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono leading-relaxed"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <Type className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-400">Pick a format and click Generate</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!content.trim() || saving}
          className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save & Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseSlides(body: string): { label: string; text: string }[] {
  const matches = [...body.matchAll(/SLIDE\s+(\d+)[:\s]+([^\n]*(?:\n(?!SLIDE\s+\d).*)*)/gi)];
  return matches.map(m => ({
    label: `Slide ${m[1]}`,
    text: m[2].replace(/\*\*/g, '').trim(),
  }));
}

// Composites slide text onto a generated image using Canvas.
// Returns a new data URL with the text overlaid on a gradient footer.
function compositeSlideImage(imageDataUrl: string, slideText: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0);

      // Dark gradient footer
      const overlayH = Math.floor(canvas.height * 0.38);
      const grad = ctx.createLinearGradient(0, canvas.height - overlayH, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.78)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);

      // Text — word-wrap into max 3 lines
      const fontSize   = Math.max(18, Math.floor(canvas.width / 16));
      const lineHeight = Math.floor(fontSize * 1.35);
      const maxWidth   = canvas.width * 0.84;
      ctx.font      = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 6;

      const words = slideText.trim().split(/\s+/);
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      const displayLines = lines.slice(0, 3);

      const blockH  = displayLines.length * lineHeight;
      const startY  = canvas.height - Math.floor(overlayH * 0.5) - Math.floor(blockH / 2) + fontSize;
      displayLines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, startY + i * lineHeight));

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageDataUrl;
  });
}

function captionToImagePrompt(caption: string, topic: string, platform: string): string {
  // Strip hashtags, take first 120 chars of caption as visual prompt context
  const clean = caption.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  return clean || `${topic}, engaging visual for ${platform}`;
}

// ── Step 2: Caption & Image ────────────────────────────────────────────────

// ── Step 2 Video Sub-Section ───────────────────────────────────────────────

function VideoSection({ pipeline, onUpdate }: {
  pipeline: Pipeline;
  onUpdate: (updates: Partial<Pipeline>) => void;
}) {
  const { settings } = useSettings();
  const [style, setStyle]     = useState('cinematic');
  const [starting, setStarting] = useState(false);
  const status  = pipeline.video_status || 'none';
  const videoUrl = pipeline.video_url || '';
  const aspectRatio = FORMAT_ASPECT[pipeline.content_format] || '9:16';

  const VIDEO_STYLES = [
    { value: 'cinematic',    label: 'Cinematic' },
    { value: 'vlog',         label: 'Vlog' },
    { value: 'promotional',  label: 'Promotional' },
    { value: 'storytelling', label: 'Storytelling' },
  ];

  async function handleGenerate() {
    setStarting(true);
    try {
      await apiClient.post(`/api/v1/pipeline/${pipeline.id}/generate-video`, {
        topic:        pipeline.topic,
        content_body: pipeline.content_body || undefined,
        style,
        aspect_ratio: aspectRatio,
        duration:     5,
        niche:        settings.niche       || undefined,
        brand_voice:  settings.brand_voice || undefined,
        location:     settings.location    || undefined,
      });
      onUpdate({ video_status: 'generating' });
      toast('🎬 Video generation started — you\'ll be notified when ready!', { duration: 5000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to start video generation.');
    } finally {
      setStarting(false);
    }
  }

  function uploadVideo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        onUpdate({ video_url: reader.result as string, video_status: 'ready' });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function downloadVideo() {
    if (!videoUrl) return;
    const resp    = await fetch(videoUrl);
    const blob    = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = blobUrl;
    a.download    = `reel-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">🎬 Video</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {aspectRatio === '9:16' ? 'Vertical Reels / TikTok (9:16)' : 'Horizontal YouTube (16:9)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={uploadVideo}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          {status !== 'generating' && (
            <button onClick={handleGenerate} disabled={starting}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
              {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
              {status === 'failed' ? 'Retry' : 'Generate'}
            </button>
          )}
        </div>
      </div>

      {/* Style picker */}
      {status !== 'ready' && !videoUrl && (
        <div className="flex flex-wrap gap-2">
          {VIDEO_STYLES.map(s => (
            <button key={s.value} onClick={() => setStyle(s.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                style === s.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Status states */}
      {status === 'generating' && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-4 flex items-start gap-3">
          <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Generating your video…</p>
            <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">
              This can take 30 seconds to 3 minutes. You can leave this page — we'll send you a notification when it's ready.
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <Bell className="w-3 h-3 text-violet-400" />
              <span className="text-xs text-violet-400">Watch the bell icon in the header</span>
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-xs text-red-600 dark:text-red-400">Video generation failed. Try again or upload a video.</p>
        </div>
      )}

      {status === 'ready' && videoUrl && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video src={videoUrl} controls className="w-full max-h-72 object-contain" />
          <button onClick={downloadVideo}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      )}

      {status === 'none' && !videoUrl && (
        <div className="flex flex-col items-center justify-center min-h-[120px] text-center px-4">
          <Video className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Generate or upload a video</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Video is optional — you can skip to review</p>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Caption & Image / Caption & Video ──────────────────────────────

function Step2CaptionImage({
  pipeline, onContinue, onBack,
}: {
  pipeline: Pipeline;
  onContinue: (updates: Partial<Pipeline>) => Promise<void>;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const isCarousel   = pipeline.content_format === 'carousel';
  const isVideoFmt   = VIDEO_FORMATS.includes(pipeline.content_format);
  const slides = isCarousel ? parseSlides(pipeline.content_body) : [];

  // Derive platform from content_format when not explicitly saved
  const FORMAT_PLATFORM: Record<string, string> = {
    linkedin_post: 'linkedin', tweet_thread: 'twitter',
    tiktok_script: 'tiktok',  youtube_script: 'youtube',
    reels_script: 'instagram', carousel: 'instagram',
  };
  const derivedPlatform = pipeline.platform || FORMAT_PLATFORM[pipeline.content_format] || 'instagram';

  const [platform, setPlatform] = useState(derivedPlatform);
  const [caption, setCaption] = useState(pipeline.caption || '');
  const [hashtags, setHashtags] = useState<string[]>(pipeline.hashtags || []);
  const [imageStyle, setImageStyle] = useState('digital art');
  const [genCaption, setGenCaption] = useState(false);
  const [saving, setSaving] = useState(false);

  // Single image state (non-carousel)
  const storedUrls = (() => { try { return JSON.parse(pipeline.image_url || '[]'); } catch { return pipeline.image_url ? [pipeline.image_url] : []; } })();
  const [singleUrl, setSingleUrl] = useState<string>(isCarousel ? '' : (storedUrls[0] ?? ''));
  const contentSnippet = pipeline.content_body?.slice(0, 120) || pipeline.topic || '';
  const [singleDesc, setSingleDesc] = useState(contentSnippet ? `${contentSnippet}, visually engaging ${derivedPlatform} post` : '');
  const [genSingle, setGenSingle] = useState(false);

  // Carousel: one state slot per slide
  const [slideUrls, setSlideUrls] = useState<string[]>(() =>
    isCarousel ? (storedUrls.length === slides.length ? storedUrls : slides.map(() => '')) : []
  );
  const [slideGenerating, setSlideGenerating] = useState<boolean[]>(() =>
    slides.map(() => false)
  );

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const lightboxUrls = isCarousel ? slideUrls : (singleUrl ? [singleUrl] : []);
  const lightboxLabels = isCarousel ? slides.map(s => s.label) : ['Visual'];
  function openLightbox(idx: number) { setLightboxIdx(idx); }
  function closeLightbox() { setLightboxIdx(null); }
  function lightboxPrev() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx - 1 + lightboxUrls.length) % lightboxUrls.length); }
  function lightboxNext() { if (lightboxIdx !== null) setLightboxIdx((lightboxIdx + 1) % lightboxUrls.length); }
  function downloadImage(url: string, label: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.replace(/\s+/g, '-').toLowerCase()}.jpg`;
    a.click();
  }
  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx]);

  async function generateCaption() {
    setGenCaption(true);
    try {
      const { data } = await apiClient.post('/api/v1/agents/caption', {
        content: pipeline.content_body,
        platform,
        include_hashtags: true,
        brand_voice: settings.brand_voice || undefined,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
      });
      const newCaption = data.caption ?? '';
      setCaption(newCaption);
      setHashtags(data.hashtags ?? []);
      // Update single image desc to be derived from the caption itself
      if (newCaption) setSingleDesc(captionToImagePrompt(newCaption, pipeline.topic, platform));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Caption generation failed.');
    } finally {
      setGenCaption(false);
    }
  }

  async function generateSingleImage() {
    setGenSingle(true);
    try {
      const { data } = await apiClient.post('/api/v1/agents/image-generator', {
        description: singleDesc,
        style: imageStyle,
        platform,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
      });
      setSingleUrl(data.image_url ?? '');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Image generation failed.');
    } finally {
      setGenSingle(false);
    }
  }

  async function generateSlideImage(idx: number) {
    setSlideGenerating(prev => { const n = [...prev]; n[idx] = true; return n; });
    const slide = slides[idx];
    const prompt = `${slide.text.slice(0, 120)}, ${pipeline.topic}, stylised ${platform} carousel slide, ${imageStyle}`;
    try {
      const { data } = await apiClient.post('/api/v1/agents/image-generator', {
        description: prompt,
        style: imageStyle,
        platform,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
      });
      const rawUrl = data.image_url ?? '';
      // Composite the slide's own text onto the generated image
      const composited = rawUrl ? await compositeSlideImage(rawUrl, slide.text) : rawUrl;
      setSlideUrls(prev => { const n = [...prev]; n[idx] = composited; return n; });
    } catch (err: any) {
      toast.error(`Slide ${idx + 1}: ${err?.response?.data?.detail ?? 'Image generation failed.'}`);
    } finally {
      setSlideGenerating(prev => { const n = [...prev]; n[idx] = false; return n; });
    }
  }

  function uploadImage(onUrl: (url: string) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onUrl(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function generateAllSlides() {
    // Generate sequentially to avoid rate limiting from concurrent requests
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i);
      if (i < slides.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Local mirror of video fields for optimistic UI updates (video gen is async)
  const [localVideoStatus, setLocalVideoStatus] = useState(pipeline.video_status || 'none');
  const [localVideoUrl, setLocalVideoUrl]       = useState(pipeline.video_url || '');

  function handleVideoUpdate(updates: Partial<Pipeline>) {
    if (updates.video_status !== undefined) setLocalVideoStatus(updates.video_status);
    if (updates.video_url    !== undefined) setLocalVideoUrl(updates.video_url);
    // Persist immediately (non-blocking)
    apiClient.patch(`/api/v1/pipeline/${pipeline.id}`, updates).catch(() => {});
  }

  async function handleContinue() {
    setSaving(true);
    const finalImageUrl = isCarousel
      ? JSON.stringify(slideUrls.filter(Boolean))
      : singleUrl;
    const updates: Partial<Pipeline> = {
      platform, caption, hashtags, image_url: finalImageUrl, current_step: 3,
    };
    // Persist local video state if user uploaded a video
    if (localVideoUrl && localVideoUrl !== pipeline.video_url) {
      updates.video_url    = localVideoUrl;
      updates.video_status = localVideoStatus;
    }
    await onContinue(updates);
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      {/* Platform picker */}
      <div className="card p-5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Target platform</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p.value} onClick={() => setPlatform(p.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                platform === p.value ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style picker shared */}
      <div className="card p-4">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Image style</label>
        <div className="flex flex-wrap gap-2">
          {IMAGE_STYLES.map(s => (
            <button key={s} onClick={() => setImageStyle(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                imageStyle === s ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isVideoFmt ? '' : 'lg:grid-cols-2'} gap-5`}>
        {/* Caption */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">✍️ Caption</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Platform-optimised caption with hashtags</p>
            </div>
            <button onClick={generateCaption} disabled={genCaption}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
              {genCaption ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>

          {genCaption ? (
            <div className="flex items-center justify-center min-h-[180px]">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : caption ? (
            <div className="space-y-3">
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={6}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((h, i) => (
                    <span key={i} className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">#{h}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[180px] text-center">
              <p className="text-sm text-gray-400">Click Generate to create a caption</p>
            </div>
          )}
        </div>

        {/* Video section (replaces image for video formats) */}
        {isVideoFmt && (
          <VideoSection
            pipeline={{ ...pipeline, video_status: localVideoStatus, video_url: localVideoUrl }}
            onUpdate={handleVideoUpdate}
          />
        )}

        {/* Image — single or carousel grid (hidden for video formats) */}
        {!isVideoFmt && <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {isCarousel ? `🎠 Slide Images (${slides.length})` : '🖼️ Visual'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isCarousel ? 'One image per carousel slide' : 'AI-generated image for your post'}
              </p>
            </div>
            {isCarousel ? (
              <button onClick={generateAllSlides}
                disabled={slideGenerating.some(Boolean)}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                {slideGenerating.some(Boolean) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate All
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => uploadImage(url => setSingleUrl(url))}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
                <button onClick={generateSingleImage} disabled={genSingle}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  {genSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate
                </button>
              </div>
            )}
          </div>

          {!isCarousel && (
            <input type="text" value={singleDesc} onChange={e => setSingleDesc(e.target.value)}
              placeholder="Describe the image…"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
          )}

          {isCarousel ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {slides.map((slide, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{slide.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{slide.text.slice(0, 60)}…</p>
                  </div>
                  {slideUrls[i] ? (
                    <div className="relative flex-shrink-0 group">
                      <img
                        src={slideUrls[i]} alt={slide.label}
                        className="w-16 h-16 rounded-lg object-cover cursor-zoom-in"
                        onClick={() => openLightbox(i)}
                      />
                      <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 pointer-events-none">
                        <Sparkles className="w-3 h-3 text-white" />
                        <Upload className="w-3 h-3 text-white" />
                      </div>
                      {/* action buttons below thumbnail */}
                      <div className="flex gap-0.5 mt-0.5">
                        <button onClick={() => generateSlideImage(i)} title="Regenerate"
                          className="flex-1 flex items-center justify-center py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                          <Sparkles className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button onClick={() => uploadImage(url => setSlideUrls(prev => { const n = [...prev]; n[i] = url; return n; }))} title="Upload"
                          className="flex-1 flex items-center justify-center py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                          <Upload className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ) : slideGenerating[i] ? (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => generateSlideImage(i)} title="Generate with AI"
                        className="w-16 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors border border-dashed border-gray-300 dark:border-gray-600">
                        <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button onClick={() => uploadImage(url => setSlideUrls(prev => { const n = [...prev]; n[i] = url; return n; }))} title="Upload image"
                        className="w-16 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors border border-dashed border-gray-300 dark:border-gray-600">
                        <Upload className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : genSingle ? (
            <div className="flex flex-col items-center justify-center min-h-[140px]">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-2" />
              <p className="text-xs text-gray-400">Generating image…</p>
            </div>
          ) : singleUrl ? (
            <div className="relative group cursor-zoom-in" onClick={() => openLightbox(0)}>
              <img src={singleUrl} alt="Generated" className="w-full rounded-xl object-cover max-h-52" />
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium">Click to view</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[140px] text-center px-4">
              <ImageIcon className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                {caption ? 'Description updated from caption — click Generate' : 'Generate a caption first for best results'}
              </p>
              <p className="text-xs text-gray-300 dark:text-gray-600">Image is optional</p>
            </div>
          )}
        </div>}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleContinue} disabled={saving}
          className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {caption ? 'Save & Review' : 'Skip to Review'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && lightboxUrls[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-medium">
                {lightboxLabels[lightboxIdx]}
                {lightboxUrls.length > 1 && (
                  <span className="ml-2 text-gray-400 text-xs">{lightboxIdx + 1} / {lightboxUrls.length}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadImage(lightboxUrls[lightboxIdx!], lightboxLabels[lightboxIdx!])}
                  className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={closeLightbox} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Image */}
            <img
              src={lightboxUrls[lightboxIdx]}
              alt={lightboxLabels[lightboxIdx]}
              className="w-full rounded-xl object-contain max-h-[75vh]"
            />

            {/* Carousel navigation */}
            {lightboxUrls.length > 1 && (
              <>
                <button
                  onClick={lightboxPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={lightboxNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
                {/* Dot indicators */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {lightboxUrls.map((url, i) => (
                    <button key={i} onClick={() => setLightboxIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === lightboxIdx ? 'bg-white' : url ? 'bg-gray-500 hover:bg-gray-400' : 'bg-gray-700'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Review ─────────────────────────────────────────────────────────

function Step3Review({
  pipeline, onComplete, onBack,
}: {
  pipeline: Pipeline;
  onComplete: () => Promise<void>;
  onBack: () => void;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    await onComplete();
    setCompleting(false);
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-green-100 dark:border-green-800">
        <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">🎉 Almost done!</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Review your content below, then complete the pipeline or head to the Schedule Agent to set a posting time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Content */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {FORMATS.find(f => f.value === pipeline.content_format)?.icon} {FORMATS.find(f => f.value === pipeline.content_format)?.label ?? 'Content'}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
            {pipeline.content_body || <span className="text-gray-400 italic">No content generated</span>}
          </p>
        </div>

        {/* Caption & Image */}
        <div className="space-y-4">
          {pipeline.caption && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">✍️ Caption</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{pipeline.caption}</p>
              {pipeline.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {pipeline.hashtags.map((h, i) => (
                    <span key={i} className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">#{h}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          {pipeline.video_url && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">🎬 Video</p>
              <video src={pipeline.video_url} controls className="w-full rounded-xl max-h-60 object-contain bg-black" />
            </div>
          )}
          {pipeline.image_url && !VIDEO_FORMATS.includes(pipeline.content_format) && (() => {
            const urls: string[] = (() => { try { const p = JSON.parse(pipeline.image_url); return Array.isArray(p) ? p : [pipeline.image_url]; } catch { return [pipeline.image_url]; } })();
            return (
              <div className="card p-5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  🖼️ {urls.length > 1 ? `Visuals (${urls.length} slides)` : 'Visual'}
                </p>
                {urls.length === 1 ? (
                  <img src={urls[0]} alt="Generated" className="w-full rounded-xl object-cover max-h-52" />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {urls.map((u, i) => <img key={i} src={u} alt={`Slide ${i + 1}`} className="w-full rounded-lg object-cover aspect-square" />)}
                  </div>
                )}
              </div>
            );
          })()}
          {!pipeline.caption && !pipeline.image_url && !pipeline.video_url && (
            <div className="card p-5 text-center text-sm text-gray-400">
              No caption or media generated. Go back to add them.
            </div>
          )}
        </div>
      </div>

      {/* Platform & schedule */}
      {pipeline.platform && (
        <div className="card p-4 flex items-center gap-3">
          <span className="text-lg">{PLATFORMS.find(p => p.value === pipeline.platform)?.icon}</span>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Target: {PLATFORMS.find(p => p.value === pipeline.platform)?.label}
            </p>
          </div>
          <button
            onClick={() => router.push(`/agents/schedule?pipelineId=${pipeline.id}`)}
            className="ml-auto btn-secondary text-xs px-3 py-1.5"
          >
            Open Schedule Agent →
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700"
        >
          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Complete Pipeline
        </button>
      </div>
    </div>
  );
}

// ── Completed View ─────────────────────────────────────────────────────────

function CompletedView({ pipeline }: { pipeline: Pipeline }) {
  const router = useRouter();
  return (
    <div className="card p-12 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pipeline complete!</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 max-w-sm">
        <strong>{pipeline.name}</strong> has been completed. Your content is saved to your library.
      </p>
      {pipeline.topic && (
        <p className="text-xs text-gray-400 mb-6">Topic: {pipeline.topic}</p>
      )}
      <div className="flex gap-3">
        <button onClick={() => router.push('/pipeline')} className="btn-secondary">
          All Pipelines
        </button>
        <button onClick={() => router.push('/content')} className="btn-primary">
          View in Content Library →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/api/v1/pipeline/${id}`)
      .then(({ data }) => setPipeline(data))
      .catch(() => { toast.error('Pipeline not found.'); router.push('/pipeline'); })
      .finally(() => setLoading(false));
  }, [id]);

  // Poll every 5s while a video is generating in the background
  useEffect(() => {
    if (!pipeline || pipeline.video_status !== 'generating') return;
    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.get(`/api/v1/pipeline/${id}`);
        setPipeline(data);
        if (data.video_status === 'ready') {
          clearInterval(interval);
          toast.success('🎬 Video is ready!');
        } else if (data.video_status === 'failed') {
          clearInterval(interval);
          toast.error('Video generation failed. You can try again.');
        }
      } catch { /* silent */ }
    }, 5_000);
    return () => clearInterval(interval);
  }, [pipeline?.video_status, id]);

  const save = useCallback(async (updates: Partial<Pipeline>) => {
    try {
      const { data } = await apiClient.patch(`/api/v1/pipeline/${id}`, updates);
      setPipeline(data);
    } catch {
      toast.error('Failed to save progress.');
      throw new Error('save failed');
    }
  }, [id]);

  async function handleContinue(updates: Partial<Pipeline>) {
    await save(updates);
  }

  async function handleBack() {
    if (!pipeline) return;
    await save({ current_step: Math.max(0, pipeline.current_step - 1) });
  }

  async function handleComplete() {
    await save({ status: 'completed', current_step: 3 });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 h-24 animate-pulse bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!pipeline) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/pipeline')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{pipeline.name}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {pipeline.status === 'completed' ? 'Completed' : `Step ${pipeline.current_step + 1} of ${STEPS.length}`}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={pipeline.current_step} status={pipeline.status} />

      {/* Step content */}
      {pipeline.status === 'completed' ? (
        <CompletedView pipeline={pipeline} />
      ) : pipeline.current_step === 0 ? (
        <Step0Topic pipeline={pipeline} onContinue={handleContinue} />
      ) : pipeline.current_step === 1 ? (
        <Step1Content pipeline={pipeline} onContinue={handleContinue} onBack={handleBack} />
      ) : pipeline.current_step === 2 ? (
        <Step2CaptionImage pipeline={pipeline} onContinue={handleContinue} onBack={handleBack} />
      ) : (
        <Step3Review pipeline={pipeline} onComplete={handleComplete} onBack={handleBack} />
      )}
    </div>
  );
}
