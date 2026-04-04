'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

const AGENTS = [
  { id: 'video',           label: 'Video Creator',          icon: '🎬', href: '/agents/video',          color: 'bg-violet-100' },
  { id: 'image-generator', label: 'Image Generator',        icon: '🖼️', href: '/agents/image-generator', color: 'bg-pink-100'   },
  { id: 'content-writer',  label: 'Content Writer',         icon: '✏️', href: '/agents/content-writer',  color: 'bg-indigo-100' },
  { id: 'caption',         label: 'Caption Agent',          icon: '✍️', href: '/agents/caption',         color: 'bg-purple-100' },
  { id: 'repurpose',       label: 'Repurposing Agent',      icon: '🔄', href: '/agents/repurpose',       color: 'bg-blue-100'   },
  { id: 'trends',          label: 'Trend Agent',            icon: '📈', href: '/agents/trends',          color: 'bg-green-100'  },
  { id: 'schedule',        label: 'Schedule Agent',         icon: '🗓️', href: '/agents/schedule',        color: 'bg-orange-100' },
  { id: 'analytics',       label: 'Analytics Agent',        icon: '📊', href: '/agents/analytics',       color: 'bg-indigo-100' },
  { id: 'comment-reply',   label: 'Comment Reply Agent',    icon: '💬', href: '/agents/comment-reply',   color: 'bg-pink-100'   },
  { id: 'influencer',      label: 'AI Influencer Manager',  icon: '🌟', href: '/agents/influencer',      color: 'bg-yellow-100' },
  { id: 'collab',          label: 'Collab & Outreach Agent',icon: '🤝', href: '/agents/collab',          color: 'bg-teal-100'   },
];

export default function FloatingActions() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <>
      {/* Click-outside overlay */}
      {open && (
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      )}

      {/* Floating container */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">

        {/* Agent menu */}
        {open && (
          <div className="flex flex-col items-end gap-1.5 mb-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 mr-1">
              Launch agent
            </p>
            {AGENTS.map((agent, i) => (
              <button
                key={agent.id}
                onClick={() => go(agent.href)}
                className="flex items-center gap-3 pl-3 pr-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-xl transition-all text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-brand-700 dark:hover:text-brand-400 group"
                style={{
                  animation: 'floatItemIn 0.18s ease-out both',
                  animationDelay: `${i * 25}ms`,
                }}
              >
                <span className={`w-7 h-7 rounded-lg ${agent.color} flex items-center justify-center text-base flex-shrink-0`}>
                  {agent.icon}
                </span>
                {agent.label}
              </button>
            ))}
          </div>
        )}

        {/* Main button */}
        <button
          onClick={() => setOpen(p => !p)}
          aria-label={open ? 'Close menu' : 'Create content'}
          className="w-14 h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>
    </>
  );
}
