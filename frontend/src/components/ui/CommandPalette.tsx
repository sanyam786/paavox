'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Wand2,
  FileText,
  TrendingUp,
  BarChart2,
  CheckSquare,
  Settings,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  group: 'navigation' | 'agents';
}

const NAV_ICON_CLASS = 'w-4 h-4';

const ALL_ITEMS: CommandItem[] = [
  // Navigation
  { id: 'dashboard',  label: 'Dashboard',        description: 'Overview & quick actions',         icon: <LayoutDashboard className={NAV_ICON_CLASS} />, href: '/dashboard',         group: 'navigation' },
  { id: 'pipeline',   label: 'Pipeline',         description: 'End-to-end content workflows',     icon: '🚀',                                           href: '/pipeline',          group: 'navigation' },
  { id: 'agents',     label: 'Agents',            description: 'All AI agents',                    icon: <Wand2 className={NAV_ICON_CLASS} />,           href: '/agents',            group: 'navigation' },
  { id: 'content',    label: 'My Content',        description: 'Generated content library',        icon: <FileText className={NAV_ICON_CLASS} />,        href: '/content',           group: 'navigation' },
  { id: 'trends',     label: 'Trending Topics',   description: 'Saved trend research',             icon: <TrendingUp className={NAV_ICON_CLASS} />,      href: '/trends',            group: 'navigation' },
  { id: 'history',    label: 'Posted History',    description: 'Recently posted content',          icon: <CheckSquare className={NAV_ICON_CLASS} />,     href: '/history',           group: 'navigation' },
  { id: 'analytics',  label: 'Analytics',         description: 'Performance & insights',           icon: <BarChart2 className={NAV_ICON_CLASS} />,       href: '/agents/analytics',  group: 'navigation' },
  { id: 'settings',   label: 'Settings',          description: 'Brand & account settings',         icon: <Settings className={NAV_ICON_CLASS} />,        href: '/settings',          group: 'navigation' },
  // Agents
  { id: 'image-generator', label: 'Image Generator',        description: 'Create platform-optimised visuals from text', icon: '🖼️', href: '/agents/image-generator', group: 'agents' },
  { id: 'video',           label: 'Video Creator',          description: 'Generate short-form AI videos for Reels & TikTok', icon: '🎬', href: '/agents/video',          group: 'agents' },
  { id: 'content-writer',  label: 'Content Writer',         description: 'Write scripts, threads, blogs & more',        icon: '✏️', href: '/agents/content-writer',  group: 'agents' },
  { id: 'caption',         label: 'Caption Agent',          description: 'Generate platform-optimised captions',        icon: '✍️', href: '/agents/caption',         group: 'agents' },
  { id: 'repurpose',       label: 'Repurposing Agent',      description: 'Transform content between platforms',         icon: '🔄', href: '/agents/repurpose',       group: 'agents' },
  { id: 'trend-agent',     label: 'Trend Agent',            description: 'Discover trending topics & ideas',            icon: '📈', href: '/agents/trends',          group: 'agents' },
  { id: 'schedule',        label: 'Schedule Agent',         description: 'AI-optimised posting times',                  icon: '🗓️', href: '/agents/schedule',        group: 'agents' },
  { id: 'analytics-agent', label: 'Analytics Agent',        description: 'Performance insights & AI strategy tips',     icon: '📊', href: '/agents/analytics',       group: 'agents' },
  { id: 'comment-reply',   label: 'Comment Reply Agent',    description: 'Generate on-brand replies to comments',       icon: '💬', href: '/agents/comment-reply',   group: 'agents' },
  { id: 'influencer',      label: 'AI Influencer Manager',  description: 'Find ideal collaborators & write DMs',        icon: '🌟', href: '/agents/influencer',      group: 'agents' },
  { id: 'collab',          label: 'Collab & Outreach Agent',description: 'Collaboration outreach messages',              icon: '🤝', href: '/agents/collab',          group: 'agents' },
];

const GROUP_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  agents: 'Agents',
};

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ALL_ITEMS.filter(
        item =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      )
    : ALL_ITEMS;

  // Build groups with pre-computed flat indices
  let flatIdx = 0;
  const groups = (['navigation', 'agents'] as const)
    .map(group => ({
      group,
      items: filtered
        .filter(i => i.group === group)
        .map(item => ({ ...item, flatIdx: flatIdx++ })),
    }))
    .filter(g => g.items.length > 0);

  const totalItems = flatIdx;

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const item = groups.flatMap(g => g.items).find(i => i.flatIdx === selectedIdx);
      if (item) navigate(item.href);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />

      {/* Palette card */}
      <div
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
        style={{ animation: 'cmdPaletteIn 0.15s ease-out' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, agents…"
            className="flex-1 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:flex items-center text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono dark:bg-gray-800">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2">
          {totalItems === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {groups.map(({ group, items }) => (
            <div key={group}>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {GROUP_LABELS[group]}
                </span>
              </div>
              {items.map(item => {
                const isSelected = item.flatIdx === selectedIdx;
                return (
                  <button
                    key={item.id}
                    data-selected={isSelected}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIdx(item.flatIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base transition-colors ${
                        isSelected
                          ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-700 dark:text-brand-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.description}</p>
                    </div>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-4">
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'], label: 'open' },
            { keys: ['esc'], label: 'close' },
          ].map(({ keys, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              {keys.map(k => (
                <kbd key={k} className="border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono text-[11px] bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                  {k}
                </kbd>
              ))}
              <span className="ml-0.5">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes cmdPaletteIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
