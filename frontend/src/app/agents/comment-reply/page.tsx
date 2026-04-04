'use client';

import { useState } from 'react';
import { Sparkles, Plus, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'twitter',   label: 'Twitter / X', icon: '🐦' },
  { value: 'linkedin',  label: 'LinkedIn',    icon: '💼' },
  { value: 'facebook',  label: 'Facebook',    icon: '👥' },
  { value: 'tiktok',    label: 'TikTok',      icon: '🎵' },
  { value: 'youtube',   label: 'YouTube',     icon: '▶️' },
];

const TONES = [
  { value: 'friendly',    label: 'Friendly',     emoji: '😊' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'humorous',    label: 'Humorous',     emoji: '😄' },
  { value: 'grateful',    label: 'Grateful',     emoji: '🙏' },
  { value: 'informative', label: 'Informative',  emoji: '💡' },
];

interface Reply { text: string; angle: string; }
interface CommentResult { comment: string; replies: Reply[]; }

export default function CommentReplyAgentPage() {
  const { settings } = useSettings();
  const [comments, setComments]   = useState<string[]>(['']);
  const [platform, setPlatform]   = useState('instagram');
  const [tone, setTone]           = useState('friendly');
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState<CommentResult[]>([]);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState<string | null>(null);

  function addComment() { setComments(prev => [...prev, '']); }
  function removeComment(i: number) { setComments(prev => prev.filter((_, idx) => idx !== i)); }
  function updateComment(i: number, val: string) {
    setComments(prev => prev.map((c, idx) => idx === i ? val : c));
  }

  async function handleGenerate() {
    const valid = comments.filter(c => c.trim());
    if (!valid.length) return;
    setLoading(true); setError(''); setResults([]);
    try {
      const { data } = await apiClient.post('/api/v1/comments/reply', {
        comments: valid,
        platform,
        tone,
        brand_name: settings.niche || '',
        niche: settings.niche || '',
        location: settings.location || '',
      });
      setResults(data.results ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong.');
    } finally { setLoading(false); }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-xl">💬</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comment Reply Agent</h1>
          <p className="text-sm text-gray-500">Generate on-brand replies to comments on your posts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* LEFT: Inputs */}
        <div className="space-y-5 lg:sticky lg:top-0 self-start">
          {/* Comments */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Comments to reply to
            </label>
            <div className="space-y-2">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={c}
                    onChange={e => updateComment(i, e.target.value)}
                    placeholder={`Comment ${i + 1}…`}
                    rows={2}
                    className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  />
                  {comments.length > 1 && (
                    <button onClick={() => removeComment(i)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {comments.length < 5 && (
              <button onClick={addComment} className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add another comment
              </button>
            )}
          </div>

          {/* Platform */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                    platform === p.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Reply tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    tone === t.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !comments.some(c => c.trim())}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Replies</>
            )}
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          {!results.length && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-3xl mb-4">💬</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your replies will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Paste comments, pick tone, and generate</p>
            </div>
          )}

          {error && (
            <div className="card p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>
            </div>
          )}

          {loading && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Crafting replies…</p>
            </div>
          )}

          {results.map((result, ri) => (
            <div key={ri} className="card p-5">
              <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 mb-4 italic">
                "{result.comment}"
              </div>
              <div className="space-y-3">
                {result.replies.map((reply, rpi) => {
                  const key = `${ri}-${rpi}`;
                  return (
                    <div key={rpi} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-brand-600 capitalize mb-1 block">{reply.angle}</span>
                        <p className="text-sm text-gray-800 dark:text-gray-100">{reply.text}</p>
                      </div>
                      <button
                        onClick={() => copyText(reply.text, key)}
                        className="flex-shrink-0 p-1.5 text-gray-400 dark:text-gray-500 hover:text-brand-600 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-700"
                      >
                        {copied === key
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
