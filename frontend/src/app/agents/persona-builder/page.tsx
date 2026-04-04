'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronDown, Users } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const CONTENT_TYPES = [
  'Educational videos', 'Lifestyle vlogs', 'Product reviews',
  'Motivational content', 'Tutorial / how-to', 'Entertainment / comedy',
  'News & commentary', 'Behind-the-scenes', 'Personal brand / storytelling',
];

const CREATOR_GOALS = [
  'Grow followers', 'Sell a product / course', 'Build a community',
  'Drive website traffic', 'Land brand deals', 'Monetise with ads',
];

interface Persona {
  persona_name: string;
  tagline: string;
  demographics: string;
  psychographics: string;
  pain_points: string;
  goals: string;
  content_habits: string;
  what_resonates: string;
  what_to_avoid: string;
  day_in_life: string;
}

const SECTIONS: { key: keyof Persona; label: string; icon: string; color: string }[] = [
  { key: 'demographics',    label: 'Demographics',            icon: '👤', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
  { key: 'psychographics',  label: 'Psychographics',          icon: '🧠', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
  { key: 'pain_points',     label: 'Pain Points',             icon: '😤', color: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
  { key: 'goals',           label: 'Goals & Aspirations',     icon: '🎯', color: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
  { key: 'content_habits',  label: 'Content Habits',          icon: '📱', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' },
  { key: 'what_resonates',  label: 'What Resonates',          icon: '✅', color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800' },
  { key: 'what_to_avoid',   label: 'What to Avoid',           icon: '🚫', color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700' },
  { key: 'day_in_life',     label: 'A Day in Their Life',     icon: '☀️', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' },
];

export default function PersonaBuilderPage() {
  const [niche, setNiche]               = useState('');
  const [contentType, setContentType]   = useState('');
  const [creatorGoal, setCreatorGoal]   = useState('');
  const [currentAudience, setCurrentAudience] = useState('');
  const [extraContext, setExtraContext]  = useState('');
  const [loading, setLoading]           = useState(false);
  const [persona, setPersona]           = useState<Persona | null>(null);
  const [error, setError]               = useState('');
  const [saved, setSaved]               = useState(false);
  const [saving, setSaving]             = useState(false);

  const canGenerate = niche.trim() && contentType && creatorGoal;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setPersona(null);
    setSaved(false);
    try {
      const { data } = await apiClient.post('/api/v1/agents/persona-builder', {
        niche,
        content_type: contentType,
        creator_goal: creatorGoal,
        current_audience: currentAudience,
        extra_context: extraContext,
      });
      setPersona(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToSettings() {
    if (!persona) return;
    setSaving(true);
    try {
      // Get the active brand, then save persona to it
      const { data: brand } = await apiClient.get('/api/v1/brands/active');
      if (brand?.id) {
        await apiClient.put(`/api/v1/brands/${brand.id}`, {
          audience_persona: JSON.stringify(persona),
        });
      } else {
        setError('No active brand found. Create a brand in Settings first.');
        return;
      }
      setSaved(true);
    } catch {
      setError('Failed to save persona to brand settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl">🎯</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audience Persona Builder</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Build a deep profile of your ideal audience — used by all agents</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* ── LEFT: Inputs ── */}
        <div className="space-y-5 lg:sticky lg:top-0 self-start">

          {/* Niche */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your niche</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. Personal finance for millennials, Fitness & nutrition, Tech reviews"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
            />
          </div>

          {/* Content type */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content type</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setContentType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    contentType === t
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={CONTENT_TYPES.includes(contentType) ? '' : contentType}
              onChange={e => setContentType(e.target.value)}
              placeholder="Or type your own…"
              className="mt-3 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
            />
          </div>

          {/* Creator goal */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Your main goal</label>
            <div className="flex flex-wrap gap-2">
              {CREATOR_GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => setCreatorGoal(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    creatorGoal === g
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={CREATOR_GOALS.includes(creatorGoal) ? '' : creatorGoal}
              onChange={e => setCreatorGoal(e.target.value)}
              placeholder="Or describe your goal…"
              className="mt-3 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
            />
          </div>

          {/* Optional context */}
          <div className="card p-5 space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Optional context</label>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">What do you know about your current audience?</label>
              <textarea
                value={currentAudience}
                onChange={e => setCurrentAudience(e.target.value)}
                placeholder="e.g. Mostly 25–34 year olds, 60% female, interested in side hustles"
                rows={2}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Anything else to include?</label>
              <textarea
                value={extraContext}
                onChange={e => setExtraContext(e.target.value)}
                placeholder="e.g. My content is beginner-friendly, I post on Instagram and TikTok"
                rows={2}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Building persona…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Build Persona
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-4">
          {!persona && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-3xl mb-4">🎯</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your audience persona will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
                Fill in your niche, content type and goal — we'll build a deep profile of exactly who you're creating for.
              </p>
            </div>
          )}

          {error && (
            <div className="card p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
            </div>
          )}

          {loading && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Researching your ideal audience…</p>
            </div>
          )}

          {persona && !loading && (
            <>
              {/* Persona header card */}
              <div className="card p-6 bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-gray-800 border-violet-100 dark:border-violet-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-3xl flex-shrink-0">
                      <Users className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{persona.persona_name}</h2>
                      <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 italic">{persona.tagline}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveToSettings}
                    disabled={saving || saved}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0 ${
                      saved
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'btn-primary'
                    }`}
                  >
                    {saving ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : saved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {saved ? 'Applied to all agents' : saving ? 'Saving…' : 'Apply to all agents'}
                  </button>
                </div>
              </div>

              {/* Persona sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map(({ key, label, icon, color }) => (
                  <div key={key} className={`card p-5 border ${color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{icon}</span>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{label}</p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {persona[key]}
                    </p>
                  </div>
                ))}
              </div>

              {/* Regenerate */}
              <button
                onClick={handleGenerate}
                className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Regenerate persona
              </button>

              {saved && (
                <div className="card p-4 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Persona saved — all agents (Caption, Content Writer, Trends, etc.) will now use this audience profile when generating content.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
