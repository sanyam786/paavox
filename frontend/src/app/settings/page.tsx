'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout, Link2, CheckCircle2, Circle, Loader2, Unlink, Users, Sparkles, Plus, Pencil, Check, X, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import type { Platform } from '@/types';

const TONES = ['engaging', 'professional', 'casual', 'funny', 'inspirational', 'educational'];
const FREQUENCIES = ['daily', '3x per week', 'weekly', 'bi-weekly'];

const BRAND_PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'twitter',   label: 'Twitter / X', icon: '🐦' },
  { value: 'linkedin',  label: 'LinkedIn', icon: '💼' },
  { value: 'tiktok',    label: 'TikTok', icon: '🎵' },
  { value: 'youtube',   label: 'YouTube', icon: '▶️' },
  { value: 'facebook',  label: 'Facebook', icon: '👥' },
];

const SOCIAL_PLATFORMS = [
  { id: 'twitter',   label: 'Twitter / X', icon: '🐦', color: 'bg-sky-100 text-sky-700' },
  { id: 'instagram', label: 'Instagram',   icon: '📸', color: 'bg-pink-100 text-pink-700' },
  { id: 'linkedin',  label: 'LinkedIn',    icon: '💼', color: 'bg-blue-100 text-blue-700' },
  { id: 'facebook',  label: 'Facebook',    icon: '👥', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'youtube',   label: 'YouTube',     icon: '▶️', color: 'bg-red-100 text-red-700' },
];

const CONTENT_TYPES = [
  'Educational videos', 'Lifestyle vlogs', 'Product reviews',
  'Motivational content', 'Tutorial / how-to', 'Entertainment / comedy',
  'News & commentary', 'Behind-the-scenes', 'Personal brand / storytelling',
];

const CREATOR_GOALS = [
  'Grow followers', 'Sell a product / course', 'Build a community',
  'Drive website traffic', 'Land brand deals', 'Monetise with ads',
];

const PERSONA_SECTIONS = [
  { key: 'demographics',   label: 'Demographics',        icon: '👤', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
  { key: 'psychographics', label: 'Psychographics',      icon: '🧠', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
  { key: 'pain_points',    label: 'Pain Points',         icon: '😤', color: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
  { key: 'goals',          label: 'Goals & Aspirations', icon: '🎯', color: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
  { key: 'content_habits', label: 'Content Habits',      icon: '📱', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' },
  { key: 'what_resonates', label: 'What Resonates',      icon: '✅', color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800' },
  { key: 'what_to_avoid',  label: 'What to Avoid',       icon: '🚫', color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700' },
  { key: 'day_in_life',    label: 'A Day in Their Life', icon: '☀️', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' },
] as const;

const WIZARD_STEPS = [
  { step: 1, label: 'Brand Profile' },
  { step: 2, label: 'Brand Voice' },
  { step: 3, label: 'Audience' },
];

const TABS = [
  { id: 'brand',     label: 'Brand Setup',        icon: '🏷️' },
  { id: 'platforms', label: 'Active Platforms',   icon: '📱' },
  { id: 'accounts',  label: 'Connected Accounts', icon: '🔗' },
];

type Tab = 'brand' | 'platforms' | 'accounts';

interface BrandSettings {
  name: string;
  niche: string;
  bio: string;
  default_tone: string;
  brand_voice: string;
  active_platforms: string[];
  posting_frequency: string;
  audience_persona: string;
  location: string;
}

interface Brand extends BrandSettings {
  id: string;
  user_id: string;
  created_at: string;
}

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

interface ConnectedAccount {
  id: string;
  platform: string;
  platform_username: string | null;
  platform_user_id: string | null;
  created_at: string;
}

const DEFAULT_SETTINGS: BrandSettings = {
  name: '',
  niche: '',
  bio: '',
  default_tone: 'engaging',
  brand_voice: '',
  active_platforms: [],
  posting_frequency: 'daily',
  audience_persona: '',
  location: '',
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab]   = useState<Tab>('brand');
  const [step, setStep] = useState(1);
  const prevSelectedBrandId = useRef<string | null>(null);

  // Brand state
  const [brands, setBrands]                   = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId]     = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [settings, setSettings]               = useState<BrandSettings>(DEFAULT_SETTINGS);

  // Loading / saving
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  // New brand creation
  const [creatingBrand, setCreatingBrand]       = useState(false);
  const [newBrandName, setNewBrandName]         = useState('');
  const [creatingLoading, setCreatingLoading]   = useState(false);

  // Brand name inline editing
  const [editingName, setEditingName]   = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  // Audience persona builder state
  const [personaNiche, setPersonaNiche]           = useState('');
  const [contentType, setContentType]             = useState('');
  const [creatorGoal, setCreatorGoal]             = useState('');
  const [currentAudience, setCurrentAudience]     = useState('');
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [persona, setPersona]                     = useState<Persona | null>(null);
  const [personaSaved, setPersonaSaved]           = useState(false);

  // Connected accounts state
  const [accounts, setAccounts]               = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [connecting, setConnecting]           = useState<string | null>(null);
  const [disconnecting, setDisconnecting]     = useState<string | null>(null);

  // Load brands on mount
  useEffect(() => {
    apiClient.get('/api/v1/brands/')
      .then(({ data }) => {
        const brandList: Brand[] = data.brands ?? [];
        const activeId: string | null = data.active_brand_id ?? null;
        setBrands(brandList);
        setActiveBrandId(activeId);
        setSelectedBrandId(activeId ?? brandList[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When selected brand changes, populate form
  useEffect(() => {
    const brandChanged = selectedBrandId !== prevSelectedBrandId.current;
    prevSelectedBrandId.current = selectedBrandId;

    if (!selectedBrandId) { setSettings(DEFAULT_SETTINGS); setPersona(null); if (brandChanged) setStep(1); return; }
    const brand = brands.find(b => b.id === selectedBrandId);
    if (!brand) return;
    setSettings({
      name: brand.name ?? '',
      niche: brand.niche ?? '',
      bio: brand.bio ?? '',
      default_tone: brand.default_tone ?? 'engaging',
      brand_voice: brand.brand_voice ?? '',
      active_platforms: brand.active_platforms ?? [],
      posting_frequency: brand.posting_frequency ?? 'daily',
      audience_persona: brand.audience_persona ?? '',
      location: brand.location ?? '',
    });
    if (brand.audience_persona) {
      try { setPersona(JSON.parse(brand.audience_persona)); } catch { setPersona(null); }
    } else {
      setPersona(null);
    }
    setPersonaSaved(false);
    // Only reset wizard step when the user switches to a different brand
    if (brandChanged) setStep(1);
  }, [selectedBrandId, brands]);

  // Tab from URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'platforms' || tabParam === 'accounts') setTab(tabParam);
  }, [searchParams]);

  // Connected accounts OAuth handler
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const { type, platform } = event.data ?? {};
      const name = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : '';
      if (type === 'OAUTH_SUCCESS') { toast.success(`${name} connected successfully!`); loadAccounts(); }
      else if (type === 'OAUTH_ERROR') { toast.error(`Failed to connect ${name}. Please try again.`); }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'accounts') loadAccounts();
  }, [tab]);

  async function loadAccounts() {
    setAccountsLoading(true);
    try {
      const { data } = await apiClient.get('/api/v1/social/accounts');
      setAccounts(data.accounts ?? []);
    } catch {} finally { setAccountsLoading(false); }
  }

  async function handleConnect(platformId: string) {
    setConnecting(platformId);
    try {
      if (platformId === 'instagram') {
        const { data } = await apiClient.post('/api/v1/social/connect-instagram-via-facebook');
        setAccounts(prev => [...prev.filter(a => a.platform !== 'instagram'), { platform: 'instagram', platform_username: `@${data.username}`, platform_user_id: data.ig_id, id: '', created_at: '' }]);
        toast.success(`Instagram (@${data.username}) connected!`);
        return;
      }
      const { data } = await apiClient.get(`/api/v1/social/connect/${platformId}`);
      window.open(data.auth_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? `Could not connect ${platformId}.`);
    } finally { setConnecting(null); }
  }

  async function handleDisconnect(platformId: string) {
    setDisconnecting(platformId);
    try {
      await apiClient.delete(`/api/v1/social/accounts/${platformId}`);
      setAccounts(prev => prev.filter(a => a.platform !== platformId));
      toast.success(`${platformId} disconnected.`);
    } catch { toast.error(`Failed to disconnect ${platformId}.`); }
    finally { setDisconnecting(null); }
  }

  function set<K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function togglePlatform(value: string) {
    setSettings(prev => ({
      ...prev,
      active_platforms: prev.active_platforms.includes(value)
        ? prev.active_platforms.filter(p => p !== value)
        : [...prev.active_platforms, value],
    }));
  }

  // Save current settings to the brand, return success bool
  async function saveBrand(): Promise<boolean> {
    if (!selectedBrandId) return false;
    setSaving(true); setError('');
    try {
      const { data } = await apiClient.put(`/api/v1/brands/${selectedBrandId}`, settings);
      setBrands(prev => prev.map(b => b.id === selectedBrandId ? { ...b, ...data } : b));
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save settings.');
      return false;
    } finally { setSaving(false); }
  }

  async function handleSaveAndContinue() {
    const ok = await saveBrand();
    if (ok) {
      toast.success('Saved!');
      setStep(s => Math.min(s + 1, 3));
    }
  }

  async function handleSaveAll() {
    const ok = await saveBrand();
    if (ok) toast.success('All brand settings saved.');
  }

  async function handleSavePlatforms() {
    const ok = await saveBrand();
    if (ok) toast.success('Platforms saved.');
  }

  async function handleCreateBrand() {
    if (!newBrandName.trim()) return;
    setCreatingLoading(true);
    try {
      const { data } = await apiClient.post('/api/v1/brands/', { name: newBrandName.trim() });
      const newBrand = data as Brand;
      setBrands(prev => [...prev, newBrand]);
      setSelectedBrandId(newBrand.id);
      if (brands.length === 0) setActiveBrandId(newBrand.id);
      setNewBrandName('');
      setCreatingBrand(false);
      toast.success(`Brand "${newBrand.name}" created.`);
    } catch {
      toast.error('Failed to create brand.');
    } finally { setCreatingLoading(false); }
  }

  async function handleActivateBrand(brandId: string) {
    try {
      await apiClient.post(`/api/v1/brands/${brandId}/activate`);
      setActiveBrandId(brandId);
      const brand = brands.find(b => b.id === brandId);
      if (brand) window.dispatchEvent(new CustomEvent('brand-activated', { detail: { name: brand.name, id: brandId } }));
      toast.success("Brand activated — agents will use this brand's settings.");
    } catch {
      toast.error('Failed to activate brand.');
    }
  }

  async function handleDeleteBrand(brandId: string) {
    if (!confirm('Delete this brand and all its settings?')) return;
    try {
      await apiClient.delete(`/api/v1/brands/${brandId}`);
      const remaining = brands.filter(b => b.id !== brandId);
      setBrands(remaining);
      if (selectedBrandId === brandId) setSelectedBrandId(remaining[0]?.id ?? null);
      if (activeBrandId === brandId) setActiveBrandId(remaining[0]?.id ?? null);
    } catch {
      toast.error('Failed to delete brand.');
    }
  }

  async function handleRenameBrand() {
    if (!selectedBrandId || !editNameValue.trim()) { setEditingName(false); return; }
    try {
      const { data } = await apiClient.put(`/api/v1/brands/${selectedBrandId}`, { name: editNameValue.trim() });
      setBrands(prev => prev.map(b => b.id === selectedBrandId ? { ...b, ...data } : b));
      setSettings(prev => ({ ...prev, name: data.name }));
      setEditingName(false);
    } catch {
      toast.error('Failed to rename brand.');
    }
  }

  async function handleGeneratePersona() {
    const niche = personaNiche || settings.niche;
    if (!niche || !contentType || !creatorGoal) return;
    setGeneratingPersona(true);
    setPersona(null);
    setPersonaSaved(false);
    try {
      const { data } = await apiClient.post('/api/v1/agents/persona-builder', {
        niche,
        content_type: contentType,
        creator_goal: creatorGoal,
        current_audience: currentAudience,
        location: settings.location || undefined,
      });
      setPersona(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to generate persona.');
    } finally { setGeneratingPersona(false); }
  }

  async function handleSavePersona() {
    if (!persona || !selectedBrandId) return;
    try {
      const personaStr = JSON.stringify(persona);
      const { data } = await apiClient.put(`/api/v1/brands/${selectedBrandId}`, { audience_persona: personaStr });
      setBrands(prev => prev.map(b => b.id === selectedBrandId ? { ...b, ...data } : b));
      setSettings(prev => ({ ...prev, audience_persona: personaStr }));
      setPersonaSaved(true);
      toast.success('Audience persona saved to this brand.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to save persona.');
    }
  }

  const canGeneratePersona = (personaNiche || settings.niche) && contentType && creatorGoal;
  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const isAudienceStep = tab === 'brand' && step === 3;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-24 animate-pulse bg-gray-100 dark:bg-gray-700" />)}
      </div>
    );
  }

  return (
    <div className={isAudienceStep ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>

      {/* ── Brand Selector ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1">Brand</span>
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrandId(brand.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                selectedBrandId === brand.id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {activeBrandId === brand.id && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
              {brand.name}
            </button>
          ))}

          {creatingBrand ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateBrand();
                  if (e.key === 'Escape') { setCreatingBrand(false); setNewBrandName(''); }
                }}
                placeholder="Brand name…"
                autoFocus
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 w-36"
              />
              <button onClick={handleCreateBrand} disabled={creatingLoading || !newBrandName.trim()}
                className="flex items-center gap-1 text-xs btn-primary px-3 py-1.5 disabled:opacity-50">
                {creatingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Create
              </button>
              <button onClick={() => { setCreatingBrand(false); setNewBrandName(''); }} className="p-1.5 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingBrand(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Brand
            </button>
          )}
        </div>

        {selectedBrand && (
          <div className="flex items-center gap-3 mt-2 ml-0.5">
            {activeBrandId === selectedBrandId ? (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active — all agents use this brand
              </span>
            ) : (
              <button onClick={() => handleActivateBrand(selectedBrandId!)} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                Set as active brand for agents
              </button>
            )}
            {brands.length > 1 && (
              <button onClick={() => handleDeleteBrand(selectedBrandId!)} className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Delete brand
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {brands.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-3xl mb-3">🏷️</p>
          <p className="font-semibold text-gray-800 dark:text-white mb-1">No brands yet</p>
          <p className="text-sm text-gray-400 mb-5">Create your first brand to configure settings for your agents.</p>
          <button onClick={() => setCreatingBrand(true)} className="btn-primary">
            <Plus className="w-4 h-4 inline mr-1" /> Create Brand
          </button>
        </div>
      )}

      {selectedBrand && (
        <>
          {/* ── Tab bar ── */}
          <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as Tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  tab === id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* ── Brand Setup: 3-step wizard ── */}
          {tab === 'brand' && (
            <div className="space-y-6">

              {/* Step indicator */}
              <div className="flex items-center">
                {WIZARD_STEPS.map(({ step: s, label }, idx) => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => setStep(s)}
                      className="flex items-center gap-2 group"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                        step === s
                          ? 'bg-brand-600 text-white'
                          : step > s
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}>
                        {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                      </div>
                      <span className={`text-sm font-medium hidden sm:block transition-colors ${
                        step === s ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      }`}>
                        {label}
                      </span>
                    </button>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-3 transition-colors ${step > s ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── Step 1: Brand Profile ── */}
              {step === 1 && (
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-1">
                    {editingName ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={e => setEditNameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameBrand(); if (e.key === 'Escape') setEditingName(false); }}
                          autoFocus
                          className="text-base font-semibold border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1"
                        />
                        <button onClick={handleRenameBrand} className="p-1 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingName(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{selectedBrand.name}</h2>
                        <button
                          onClick={() => { setEditNameValue(selectedBrand.name); setEditingName(true); }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Rename brand"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Tell agents about your niche and what you create.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your niche</label>
                      <input type="text" value={settings.niche} onChange={e => set('niche', e.target.value)}
                        placeholder="e.g. Personal finance for millennials, Fitness & nutrition, Tech reviews…"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                      <p className="text-xs text-gray-400 mt-1">Agents will use this to tailor content ideas and hashtags.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your location</label>
                      <input type="text" value={settings.location} onChange={e => set('location', e.target.value)}
                        placeholder="e.g. India, United States, United Kingdom, UAE…"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                      <p className="text-xs text-gray-400 mt-1">Agents will tailor cultural references, trends, and examples to your region.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio / About</label>
                      <textarea value={settings.bio} onChange={e => set('bio', e.target.value)}
                        placeholder="Brief description of you and your content (used as context for agents)"
                        rows={4} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posting frequency</label>
                      <div className="flex flex-wrap gap-2">
                        {FREQUENCIES.map(f => (
                          <button key={f} onClick={() => set('posting_frequency', f)}
                            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
                              settings.posting_frequency === f
                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                            }`}>{f}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Brand Voice ── */}
              {step === 2 && (
                <div className="card p-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Brand Voice</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Define how you sound. Agents will match your style.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default tone</label>
                      <div className="grid grid-cols-3 gap-2">
                        {TONES.map(t => (
                          <button key={t} onClick={() => set('default_tone', t)}
                            className={`py-2 px-3 rounded-lg text-sm border transition-colors capitalize ${
                              settings.default_tone === t
                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                            }`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand voice description</label>
                      <textarea value={settings.brand_voice} onChange={e => set('brand_voice', e.target.value)}
                        placeholder={`Describe your unique voice in a few sentences.\n\nExamples:\n• "Direct, data-driven, no fluff. I back up every claim with numbers."\n• "Warm and relatable, like advice from a best friend. I use humor to explain complex ideas."`}
                        rows={6} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                      <p className="text-xs text-gray-400 mt-1">The more specific you are, the better agents will match your voice.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Audience Persona ── */}
              {step === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
                  <div className="space-y-5 lg:sticky lg:top-6">
                    <div className="card p-6">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Audience Persona</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                        Describe who you're creating for. Agents will use this to write more targeted content.
                      </p>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Niche <span className="text-gray-400 font-normal">(leave blank to use Brand Profile niche)</span>
                          </label>
                          <input type="text" value={personaNiche} onChange={e => setPersonaNiche(e.target.value)}
                            placeholder={settings.niche || 'e.g. Personal finance for millennials'}
                            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content type</label>
                          <div className="flex flex-wrap gap-2">
                            {CONTENT_TYPES.map(t => (
                              <button key={t} onClick={() => setContentType(t)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                  contentType === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your main goal</label>
                          <div className="flex flex-wrap gap-2">
                            {CREATOR_GOALS.map(g => (
                              <button key={g} onClick={() => setCreatorGoal(g)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                  creatorGoal === g ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}>{g}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Current audience <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <textarea value={currentAudience} onChange={e => setCurrentAudience(e.target.value)}
                            placeholder="e.g. Mostly 25–34 year olds, 60% female, interested in side hustles"
                            rows={2} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" />
                        </div>
                        <button onClick={handleGeneratePersona} disabled={generatingPersona || !canGeneratePersona}
                          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
                          {generatingPersona
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Building persona…</>
                            : <><Sparkles className="w-4 h-4" /> {persona ? 'Regenerate persona' : 'Build audience persona'}</>}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!persona && !generatingPersona && (
                      <div className="card p-10 flex flex-col items-center justify-center text-center min-h-[360px]">
                        <Users className="w-10 h-10 text-violet-300 mb-4" />
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your audience persona will appear here</p>
                        <p className="text-sm text-gray-400 max-w-xs">Fill in your niche, content type and goal — we'll build a deep profile of exactly who you're creating for.</p>
                      </div>
                    )}
                    {generatingPersona && (
                      <div className="card p-10 flex flex-col items-center justify-center min-h-[360px]">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
                        <p className="text-sm text-gray-500">Researching your ideal audience…</p>
                      </div>
                    )}
                    {persona && !generatingPersona && (
                      <>
                        <div className="card p-5 bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-gray-800 border-violet-100 dark:border-violet-800">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{persona.persona_name}</p>
                                <p className="text-xs text-violet-600 dark:text-violet-400 italic">{persona.tagline}</p>
                              </div>
                            </div>
                            <button onClick={handleSavePersona}
                              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                personaSaved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'btn-primary'
                              }`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {personaSaved ? 'Saved to brand' : 'Save to brand'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {PERSONA_SECTIONS.map(({ key, label, icon, color }) => (
                            <div key={key} className={`card p-4 border ${color}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span>{icon}</span>
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{label}</p>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{persona[key]}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Wizard navigation ── */}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(s => Math.max(s - 1, 1))}
                  disabled={step === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                {step < 3 ? (
                  <button onClick={handleSaveAndContinue} disabled={saving}
                    className="btn-primary flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save & Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleSaveAll} disabled={saving}
                    className="btn-primary flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save All Settings
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Active Platforms ── */}
          {tab === 'platforms' && (
            <div className="space-y-5">
              <div className="card p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Active Platforms</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Select the platforms you're active on. Agents will prioritize these when generating content.</p>
                <div className="grid grid-cols-2 gap-3">
                  {BRAND_PLATFORMS.map(({ value, label, icon }) => {
                    const active = settings.active_platforms.includes(value);
                    return (
                      <button key={value} onClick={() => togglePlatform(value)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                          active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-600'
                        }`}>
                        <span className="text-2xl">{icon}</span>
                        <span className={`text-sm font-medium ${active ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                        <span className="ml-auto">
                          {active ? <CheckCircle2 className="w-5 h-5 text-brand-500" /> : <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {settings.active_platforms.length === 0 && (
                  <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Select at least one platform so agents know where to optimise your content.
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end">
                <button onClick={handleSavePlatforms} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                  Save Platforms
                </button>
              </div>
            </div>
          )}

          {/* ── Connected Accounts ── */}
          {tab === 'accounts' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Connected Accounts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Connect your social accounts to enable auto-scheduling and direct publishing.</p>
              {accountsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {SOCIAL_PLATFORMS.map(({ id, label, icon, color }: any) => {
                    const account = accounts.find(a => a.platform === id);
                    return (
                      <div key={id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                        account ? 'border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
                            {account
                              ? <p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{account.platform_username ?? 'Connected'}</p>
                              : <p className="text-xs text-gray-400 dark:text-gray-500">Not connected</p>}
                          </div>
                        </div>
                        {account ? (
                          <button onClick={() => handleDisconnect(id)} disabled={disconnecting === id}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50">
                            {disconnecting === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                            Disconnect
                          </button>
                        ) : (
                          <button onClick={() => handleConnect(id)} disabled={connecting !== null}
                            className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50">
                            {connecting === id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : 'Connect'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  You need to create developer apps on each platform and add the credentials to your backend <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> file before connecting.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
