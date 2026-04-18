'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Save, Check, RefreshCw, Youtube, Download, Scissors, Clock, Loader2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

// ── YouTube Shorts types ────────────────────────────────────────────────────
interface ViralMoment {
  index: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  reason: string;
  hook: string;
}
interface ShortsAnalysis {
  video_title: string;
  total_duration_seconds: number;
  moments: ViralMoment[];
}
interface ClipState {
  generating: boolean;
  clip_id: string | null;
  public_url: string | null;
  downloading: boolean;
  uploading: boolean;
  uploaded: boolean;
  youtube_url: string | null;
  error: string;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'twitter',   label: 'Twitter / X', icon: '🐦' },
  { value: 'linkedin',  label: 'LinkedIn', icon: '💼' },
  { value: 'tiktok',    label: 'TikTok', icon: '🎵' },
  { value: 'youtube',   label: 'YouTube', icon: '▶️' },
  { value: 'facebook',  label: 'Facebook', icon: '👥' },
];

interface RepurposeResult {
  repurposed_content: string;
  changes: string[];
  platform: string;
}

export default function RepurposeAgentPage() {
  const { settings, loaded: settingsLoaded } = useSettings();

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'repurpose' | 'shorts'>('repurpose');

  // ── Repurpose state ───────────────────────────────────────────────────────
  const [content, setContent]               = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('instagram');
  const [targetPlatform, setTargetPlatform] = useState('linkedin');
  const [preserveTone, setPreserveTone]     = useState(true);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState<RepurposeResult | null>(null);
  const [editedContent, setEditedContent]   = useState('');
  const [error, setError]                   = useState('');
  const [saved, setSaved]                   = useState(false);
  const [saving, setSaving]                 = useState(false);

  // ── YouTube Shorts state ──────────────────────────────────────────────────
  const [youtubeUrl, setYoutubeUrl]         = useState('');
  const [analyzing, setAnalyzing]           = useState(false);
  const [analysis, setAnalysis]             = useState<ShortsAnalysis | null>(null);
  const [shortsError, setShortsError]       = useState('');
  const [clipStates, setClipStates]         = useState<Record<number, ClipState>>({});
  const [uploadModal, setUploadModal]       = useState<{ idx: number; moment: ViralMoment } | null>(null);
  const [uploadTitle, setUploadTitle]       = useState('');
  const [uploadDesc, setUploadDesc]         = useState('');
  const [uploadPrivacy, setUploadPrivacy]   = useState<'public' | 'private' | 'unlisted'>('public');

  // Pre-select source platform from active platforms in settings
  useEffect(() => {
    if (!settingsLoaded) return;
    const active = settings.active_platforms;
    if (active.length > 0) setSourcePlatform(active[0]);
    if (active.length > 1) setTargetPlatform(active[1]);
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceInfo = PLATFORMS.find(p => p.value === sourcePlatform)!;
  const targetInfo = PLATFORMS.find(p => p.value === targetPlatform)!;

  async function handleGenerate() {
    if (!content.trim()) return;
    if (sourcePlatform === targetPlatform) {
      setError('Source and target platforms must be different.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);

    try {
      const { data } = await apiClient.post('/api/v1/agents/repurpose', {
        content,
        source_platform: sourcePlatform,
        target_platform: targetPlatform,
        preserve_tone: preserveTone,
        brand_voice: settings.brand_voice || undefined,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
      });
      setResult(data);
      setEditedContent(data.repurposed_content);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await apiClient.post('/api/v1/agents/repurpose/save', {
        content: editedContent,
        platform: targetPlatform,
        source_platform: sourcePlatform,
        original_content: content,
        changes: result.changes,
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    if (!youtubeUrl.trim()) return;
    setAnalyzing(true);
    setShortsError('');
    setAnalysis(null);
    setClipStates({});
    try {
      const { data } = await apiClient.post('/api/v1/agents/youtube-shorts/analyze', { url: youtubeUrl });
      setAnalysis(data);
    } catch (err: any) {
      setShortsError(err.response?.data?.detail ?? err.message ?? 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateClip(moment: ViralMoment) {
    const idx = moment.index;
    setClipStates(prev => ({ ...prev, [idx]: { generating: true, clip_id: null, public_url: null, downloading: false, uploading: false, uploaded: false, youtube_url: null, error: '' } }));
    try {
      const { data } = await apiClient.post('/api/v1/agents/youtube-shorts/clip', {
        url: youtubeUrl,
        start_seconds: moment.start_seconds,
        end_seconds: moment.end_seconds,
        title: moment.title,
        crop_vertical: true,
      });
      setClipStates(prev => ({ ...prev, [idx]: { generating: false, clip_id: data.clip_id, public_url: data.public_url || null, downloading: false, uploading: false, uploaded: false, youtube_url: null, error: '' } }));
    } catch (err: any) {
      setClipStates(prev => ({ ...prev, [idx]: { generating: false, clip_id: null, public_url: null, downloading: false, uploading: false, uploaded: false, youtube_url: null, error: err.response?.data?.detail ?? 'Generation failed.' } }));
    }
  }

  function openUploadModal(idx: number, moment: ViralMoment) {
    setUploadTitle(moment.title);
    setUploadDesc(moment.hook);
    setUploadPrivacy('public');
    setUploadModal({ idx, moment });
  }

  async function handleUploadToYouTube() {
    if (!uploadModal) return;
    const { idx } = uploadModal;
    const publicUrl = clipStates[idx]?.public_url;
    if (!publicUrl) return;
    setClipStates(prev => ({ ...prev, [idx]: { ...prev[idx], uploading: true, error: '' } }));
    setUploadModal(null);
    try {
      const { data } = await apiClient.post('/api/v1/agents/youtube-shorts/upload', {
        video_url: publicUrl,
        title: uploadTitle,
        description: uploadDesc,
        privacy: uploadPrivacy,
      });
      setClipStates(prev => ({ ...prev, [idx]: { ...prev[idx], uploading: false, uploaded: true, youtube_url: data.url } }));
    } catch (err: any) {
      setClipStates(prev => ({ ...prev, [idx]: { ...prev[idx], uploading: false, error: err.response?.data?.detail ?? 'Upload failed.' } }));
    }
  }

  function handleDownload(idx: number, moment: ViralMoment) {
    const publicUrl = clipStates[idx]?.public_url;
    if (!publicUrl) return;
    const a = document.createElement('a');
    a.href = publicUrl;
    a.download = `${moment.title.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '')}.mp4`;
    a.click();
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">🔄</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repurposing Agent</h1>
          <p className="text-sm text-gray-500">Transform content across platforms or clip YouTube Shorts</p>
        </div>
        {settingsLoaded && (settings.brand_voice || settings.niche) && (
          <span className="ml-auto text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
            ✓ Brand settings applied
          </span>
        )}
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setMode('repurpose')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'repurpose'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Repurpose Content
        </button>
        <button
          onClick={() => setMode('shorts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'shorts'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Youtube className="w-4 h-4" />
          YouTube Shorts Clipper
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          REPURPOSE TAB
      ══════════════════════════════════════════════════════════════ */}
      {mode === 'repurpose' && (
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">

          {/* ── LEFT: Input ── */}
          <div className="space-y-5 lg:sticky lg:top-0 self-start">

            <div className="card p-5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transform from → to</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Source</label>
                  <select
                    value={sourcePlatform}
                    onChange={e => setSourcePlatform(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-shrink-0 mt-4">
                  <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>

                <div className="flex-1">
                  <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Target</label>
                  <select
                    value={targetPlatform}
                    onChange={e => setTargetPlatform(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {sourcePlatform === targetPlatform && (
                <p className="text-xs text-red-500 mt-2">Source and target must be different platforms.</p>
              )}
            </div>

            <div className="card p-5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Original {sourceInfo.icon} {sourceInfo.label} content
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Paste your ${sourceInfo.label} content here...`}
                rows={7}
                className="w-full text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{content.length} characters</p>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Preserve original tone</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Keep the same voice, just adapt the format</p>
                </div>
                <button
                  onClick={() => setPreserveTone(!preserveTone)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    preserveTone ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    preserveTone ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !content.trim() || sourcePlatform === targetPlatform}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Repurposing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Repurpose for {targetInfo.label}
                </>
              )}
            </button>
          </div>

          {/* ── RIGHT: Output ── */}
          <div className="space-y-5">
            {!result && !loading && !error && (
              <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-3xl mb-4">🔄</div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Repurposed content will appear here</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Paste your content and choose platforms to start</p>
              </div>
            )}

            {error && (
              <div className="card p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
              </div>
            )}

            {loading && (
              <div className="card p-8 flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-sm text-gray-500">Transforming your content…</p>
              </div>
            )}

            {result && !loading && (
              <>
                {result.changes.length > 0 && (
                  <div className="card p-4 bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">✨ What was changed</p>
                    <ul className="space-y-1">
                      {result.changes.map((change, i) => (
                        <li key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1.5">
                          <span className="mt-0.5">•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{targetInfo.icon}</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{targetInfo.label} Version</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full ml-auto">Editable</span>
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    rows={8}
                    className="w-full text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{editedContent.length} characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleGenerate}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 text-sm"
                  >
                    {saved ? (
                      <><Check className="w-4 h-4" /> Saved!</>
                    ) : saving ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Saving…</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save to My Content</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          YOUTUBE SHORTS TAB
      ══════════════════════════════════════════════════════════════ */}
      {mode === 'shorts' && (
        <div className="space-y-6">

          {/* URL input + Analyze */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              YouTube Video URL
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Paste any YouTube link — the AI will find the best 3–5 moments to clip as Shorts.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !youtubeUrl.trim()}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap"
              >
                {analyzing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                ) : (
                  <><Scissors className="w-4 h-4" /> Find Moments</>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {shortsError && (
            <div className="card p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {shortsError}</p>
            </div>
          )}

          {/* Analyzing skeleton */}
          {analyzing && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[260px]">
              <div className="w-10 h-10 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fetching transcript &amp; analyzing…</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">This can take 10–20 seconds</p>
            </div>
          )}

          {/* Results */}
          {analysis && !analyzing && (
            <>
              <div className="flex items-center gap-3">
                <Youtube className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{analysis.video_title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Total duration: {formatSeconds(analysis.total_duration_seconds)} · {analysis.moments.length} viral moments found
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {analysis.moments.map(moment => {
                  const cs = clipStates[moment.index];
                  const isGenerating = cs?.generating ?? false;
                  const hasClip     = !!(cs?.public_url);
                  const clipError   = cs?.error ?? '';

                  return (
                    <div key={moment.index} className="card p-4 flex flex-col gap-3">
                      {/* Title + duration */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug flex-1">
                          {moment.title}
                        </h3>
                        <span className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          {moment.duration_seconds}s
                        </span>
                      </div>

                      {/* Timestamps */}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatSeconds(moment.start_seconds)} → {formatSeconds(moment.end_seconds)}
                      </p>

                      {/* Hook */}
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-0.5">Hook</p>
                        <p className="text-xs text-yellow-800 dark:text-yellow-300 italic">"{moment.hook}"</p>
                      </div>

                      {/* Reason */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{moment.reason}</p>

                      {/* Error */}
                      {clipError && (
                        <p className="text-xs text-red-500">{clipError}</p>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-1 space-y-2">
                        {/* Video preview */}
                        {hasClip && cs?.public_url && (
                          <video
                            src={cs.public_url}
                            controls
                            className="w-full rounded-lg max-h-48 bg-black"
                          />
                        )}

                        {cs?.uploaded && cs.youtube_url && (
                          <a
                            href={cs.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-center text-red-500 hover:text-red-600 font-medium"
                          >
                            ✓ Posted to YouTube →
                          </a>
                        )}

                        {!hasClip ? (
                          <button
                            onClick={() => handleGenerateClip(moment)}
                            disabled={isGenerating}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-2 text-sm"
                          >
                            {isGenerating ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Clipping…</>
                            ) : (
                              <><Scissors className="w-4 h-4" /> Generate Clip</>
                            )}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownload(moment.index, moment)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button
                              onClick={() => openUploadModal(moment.index, moment)}
                              disabled={cs?.uploading || cs?.uploaded}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
                            >
                              {cs?.uploading ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                              ) : cs?.uploaded ? (
                                <><Check className="w-3.5 h-3.5" /> Posted</>
                              ) : (
                                <><Youtube className="w-3.5 h-3.5" /> Post to YT</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state */}
          {!analysis && !analyzing && !shortsError && (
            <div className="card p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-3xl mb-4">
                <Youtube className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">No video analyzed yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                Paste a YouTube URL above and click "Find Moments" to identify the best clips for Shorts.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Upload to YouTube Modal ── */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Post to YouTube</h2>
                <p className="text-xs text-gray-400">Upload this Short to your YouTube channel</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  maxLength={100}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{uploadTitle.length}/100</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Privacy</label>
                <select
                  value={uploadPrivacy}
                  onChange={e => setUploadPrivacy(e.target.value as 'public' | 'private' | 'unlisted')}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-800"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setUploadModal(null)}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadToYouTube}
                disabled={!uploadTitle.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
              >
                <Youtube className="w-4 h-4" /> Upload Short
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
