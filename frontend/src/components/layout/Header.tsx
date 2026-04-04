'use client';

import { usePathname } from 'next/navigation';
import { Search, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ui/ThemeProvider';
import NotificationBell from '@/components/ui/NotificationBell';

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':            { title: 'Dashboard',             subtitle: 'Your content command center' },
  '/pipeline':             { title: 'Pipeline',              subtitle: 'Your content workflow' },
  '/agents':               { title: 'AI Agents',             subtitle: 'Full content workflow — discover, create, publish, grow' },
  '/agents/caption':       { title: 'Caption Agent',         subtitle: 'Platform-optimised captions with hashtags' },
  '/agents/repurpose':     { title: 'Repurposing Agent',     subtitle: 'Transform content across platforms instantly' },
  '/agents/trends':        { title: 'Trend Agent',           subtitle: 'Discover what\'s trending in your niche' },
  '/agents/schedule':      { title: 'Schedule Agent',        subtitle: 'AI-optimised posting times & queue' },
  '/agents/analytics':     { title: 'Analytics Agent',       subtitle: 'Performance insights & AI strategy tips' },
  '/agents/comment-reply': { title: 'Comment Reply Agent',   subtitle: 'On-brand replies to comments at scale' },
  '/agents/influencer':    { title: 'Influencer Manager',    subtitle: 'Find ideal collaborators & write outreach DMs' },
  '/agents/collab':        { title: 'Collab & Outreach',     subtitle: 'Personalised messages for any partnership type' },
  '/agents/content-writer':{ title: 'Content Writer',        subtitle: 'Scripts, threads, blogs, carousels & newsletters' },
  '/agents/image-generator':{ title: 'Image Generator',      subtitle: 'Platform-optimised visuals from a text prompt' },
  '/agents/video':         { title: 'Video Creator',         subtitle: 'Short-form AI videos for Reels, TikTok & Shorts' },
  '/agents/competitor-analysis':{ title: 'Competitor Analysis', subtitle: 'Analyse strategies and find content gaps' },
  '/agents/persona-builder':{ title: 'Persona Builder',      subtitle: 'Build your ideal audience persona' },
  '/history':              { title: 'Posted History',        subtitle: 'All your published content' },
  '/content':              { title: 'My Content',            subtitle: 'All generated & saved content' },
  '/trends':               { title: 'Trending Topics',       subtitle: 'What\'s hot in your niche right now' },
  '/calendar':             { title: 'Calendar',              subtitle: 'Visual schedule of upcoming posts' },
  '/settings':             { title: 'Settings',              subtitle: 'Brands, platforms & preferences' },
};

export default function Header() {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? { title: 'Paavox', subtitle: '' };
  const { theme, toggle } = useTheme();

  function openPalette() {
    window.dispatchEvent(new CustomEvent('openCommandPalette'));
  }

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center px-5 gap-4 border-b border-gray-100/80 dark:border-white/[0.05] sticky top-0 z-30 backdrop-blur-md"
      style={{ backgroundColor: 'var(--sidebar-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight truncate">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight truncate hidden md:block">
            {meta.subtitle}
          </p>
        )}
      </div>

      {/* Search trigger */}
      <button
        onClick={openPalette}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200
          bg-gray-50 border-gray-200 text-gray-400
          hover:bg-white hover:border-indigo-300 hover:text-indigo-500 hover:shadow-sm hover:shadow-indigo-500/10
          dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-gray-500
          dark:hover:bg-indigo-500/[0.08] dark:hover:border-indigo-500/40 dark:hover:text-indigo-400"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Search…</span>
        <span className="flex items-center gap-0.5 opacity-60 ml-0.5">
          <kbd className="text-[10px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 font-mono leading-none">⌘</kbd>
          <kbd className="text-[10px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 font-mono leading-none">K</kbd>
        </span>
      </button>

      <NotificationBell />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle dark mode"
        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all duration-200"
      >
        {theme === 'dark'
          ? <Sun className="w-4 h-4" />
          : <Moon className="w-4 h-4" />
        }
      </button>
    </header>
  );
}
