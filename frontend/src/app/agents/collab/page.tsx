'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, CheckCircle2, Handshake, MessageSquare, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'youtube',   label: 'YouTube',   icon: '▶️' },
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵' },
  { value: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
  { value: 'twitter',   label: 'Twitter/X', icon: '🐦' },
  { value: 'podcast',   label: 'Podcast',   icon: '🎙️' },
];

const COLLAB_TYPES = [
  { value: 'podcast_guest',   label: 'Podcast Guest',      icon: '🎙️', desc: 'Appear on relevant podcasts' },
  { value: 'cross_promotion', label: 'Cross-Promotion',    icon: '🔄', desc: 'Promote each other\'s content' },
  { value: 'co_created',      label: 'Co-Created Content', icon: '🎨', desc: 'Create content together' },
  { value: 'newsletter_swap', label: 'Newsletter Swap',    icon: '📧', desc: 'Feature each other in newsletters' },
  { value: 'ig_takeover',     label: 'IG Takeover',        icon: '📱', desc: 'Take over each other\'s account' },
  { value: 'joint_webinar',   label: 'Joint Webinar',      icon: '🖥️', desc: 'Host a live session together' },
  { value: 'affiliate',       label: 'Affiliate Deal',     icon: '💰', desc: 'Referral or affiliate partnership' },
  { value: 'brand_collab',    label: 'Brand Collab',       icon: '🤝', desc: 'Co-branded product or campaign' },
];

const CONTACT_BADGE: Record<string, string> = {
  DM:       'bg-pink-50 text-pink-600',
  email:    'bg-blue-50 text-blue-600',
  LinkedIn: 'bg-sky-50 text-sky-700',
  comment:  'bg-gray-50 text-gray-600',
};

const TYPE_BADGE: Record<string, string> = {
  creator:    'bg-purple-50 text-purple-600',
  brand:      'bg-green-50 text-green-600',
  podcast:    'bg-orange-50 text-orange-600',
  newsletter: 'bg-yellow-50 text-yellow-600',
  agency:     'bg-indigo-50 text-indigo-600',
};

interface Collaborator {
  name: string;
  type: string;
  audience_fit: string;
  collab_angle: string;
  mutual_value: string;
  outreach_message: string;
  best_contact_method: string;
}

interface CollabResult {
  collaborators: Collaborator[];
  pitch_template: string;
  dos: string[];
  donts: string[];
}

export default function CollabAgentPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const [niche, setNiche]             = useState('');
  const [collabType, setCollabType]   = useState('cross_promotion');
  const [platform, setPlatform]       = useState('instagram');
  const [yourValue, setYourValue]     = useState('');
  const [audienceSize, setAudienceSize] = useState('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<CollabResult | null>(null);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [showPitch, setShowPitch]     = useState(false);

  useEffect(() => {
    if (settingsLoaded && settings.niche) setNiche(settings.niche);
  }, [settingsLoaded]); // eslint-disable-line

  async function handleFind() {
    if (!niche.trim() || !yourValue.trim()) return;
    setLoading(true); setError(''); setResult(null); setExpanded(null); setShowPitch(false);
    try {
      const { data } = await apiClient.post('/api/v1/collab/find', {
        niche,
        collab_type: collabType,
        platform,
        your_value: yourValue,
        audience_size: audienceSize,
        location: settings.location || '',
      });
      setResult(data);
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
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xl">🤝</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collab & Outreach Agent</h1>
          <p className="text-sm text-gray-500">Find ideal collaborators and get personalised outreach messages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Inputs */}
        <div className="space-y-5">
          {/* Niche */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your niche</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. personal finance for millennials"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {settingsLoaded && settings.niche && niche !== settings.niche && (
              <button onClick={() => setNiche(settings.niche)} className="mt-1 text-xs text-brand-600 hover:underline">
                ↩ Reset to brand profile
              </button>
            )}
          </div>

          {/* Collab type */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Collaboration type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {COLLAB_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setCollabType(t.value)}
                  title={t.desc}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                    collabType === t.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Primary platform</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    platform === p.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* What you bring */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What you bring</label>
            <textarea
              value={yourValue}
              onChange={e => setYourValue(e.target.value)}
              placeholder="e.g. 20K engaged Instagram followers, expertise in budgeting content, high-quality Reels production"
              rows={3}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Audience size (optional) */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Your audience size <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={audienceSize}
              onChange={e => setAudienceSize(e.target.value)}
              placeholder="e.g. 20K Instagram, 5K newsletter"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <button
            onClick={handleFind}
            disabled={loading || !niche.trim() || !yourValue.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Finding…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Find Collaborators</>
            )}
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-3xl mb-4">🤝</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your collaborator matches will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Fill in your niche, collab type, and what you bring</p>
            </div>
          )}

          {error && <div className="card p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950"><p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p></div>}

          {loading && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Finding your best collaboration matches…</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Collaborator cards */}
              {result.collaborators.map((collab, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{collab.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[collab.type] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          {collab.type}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONTACT_BADGE[collab.best_contact_method] ?? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                          via {collab.best_contact_method}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-700 dark:text-gray-300">Collab angle:</span> {collab.collab_angle}</p>
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-700 dark:text-gray-300">Audience fit:</span> {collab.audience_fit}</p>
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-700 dark:text-gray-300">Mutual value:</span> {collab.mutual_value}</p>
                  </div>

                  {/* Outreach message */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Outreach Message</span>
                      </div>
                      <button
                        onClick={() => copyText(collab.outreach_message, `msg-${i}`)}
                        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-brand-600 transition-colors"
                      >
                        {copied === `msg-${i}`
                          ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copied</>
                          : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </button>
                    </div>
                    <p className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line ${expanded === i ? '' : 'line-clamp-4'}`}>
                      {collab.outreach_message}
                    </p>
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="text-xs text-brand-600 mt-1 hover:underline"
                    >
                      {expanded === i ? 'Show less' : 'Read full message'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Pitch template */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Reusable Pitch Template</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(result.pitch_template, 'pitch')}
                      className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-brand-600 transition-colors"
                    >
                      {copied === 'pitch'
                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copied</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                    <button
                      onClick={() => setShowPitch(!showPitch)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {showPitch ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {showPitch && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    {result.pitch_template}
                  </p>
                )}
              </div>

              {/* Dos and Don'ts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Do's</span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.dos?.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <ThumbsDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Don'ts</span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.donts?.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">✗</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
