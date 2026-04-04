import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const groups = [
  {
    step: 1,
    label: 'Discover',
    description: 'Find what\'s trending and what your audience wants',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500',
    agents: [
      {
        id: 'trends',
        name: 'Trend Agent',
        description: 'Discover trending topics and get content ideas tailored to your niche. Includes viral moment detection and local vs global scope.',
        icon: '📈',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        glow: 'rgba(16,185,129,0.07)',
        border: 'rgba(16,185,129,0.5)',
        href: '/agents/trends',
      },
      {
        id: 'competitor-analysis',
        name: 'Competitor Analysis',
        description: 'Analyse any competitor\'s content strategy, find their weaknesses, and discover content gaps you can win.',
        icon: '🔍',
        iconBg: 'bg-rose-100 dark:bg-rose-900/40',
        glow: 'rgba(244,63,94,0.07)',
        border: 'rgba(244,63,94,0.5)',
        href: '/agents/competitor-analysis',
      },
    ],
  },
  {
    step: 2,
    label: 'Create',
    description: 'Write, design, and shape your content',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500',
    agents: [
      {
        id: 'content-writer',
        name: 'Content Writer',
        description: 'Write full content — video scripts, tweet threads, blog posts, carousels, newsletters and more.',
        icon: '✏️',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
        glow: 'rgba(99,102,241,0.07)',
        border: 'rgba(99,102,241,0.5)',
        href: '/agents/content-writer',
      },
      {
        id: 'caption',
        name: 'Caption Agent',
        description: 'Generate platform-optimised captions with hashtags for any content.',
        icon: '✍️',
        iconBg: 'bg-violet-100 dark:bg-violet-900/40',
        glow: 'rgba(139,92,246,0.07)',
        border: 'rgba(139,92,246,0.5)',
        href: '/agents/caption',
      },
      {
        id: 'image-generator',
        name: 'Image Generator',
        description: 'Create platform-optimised visuals from a text description. Supports 6 styles and every major platform size.',
        icon: '🖼️',
        iconBg: 'bg-pink-100 dark:bg-pink-900/40',
        glow: 'rgba(236,72,153,0.07)',
        border: 'rgba(236,72,153,0.5)',
        href: '/agents/image-generator',
      },
      {
        id: 'video',
        name: 'Video Creator',
        description: 'Generate short-form AI videos for Reels, TikTok, and YouTube Shorts from a topic or existing content.',
        icon: '🎬',
        iconBg: 'bg-violet-100 dark:bg-violet-900/40',
        glow: 'rgba(139,92,246,0.07)',
        border: 'rgba(139,92,246,0.5)',
        href: '/agents/video',
      },
      {
        id: 'repurpose',
        name: 'Repurposing Agent',
        description: 'Transform content from one format or platform to another instantly.',
        icon: '🔄',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        glow: 'rgba(59,130,246,0.07)',
        border: 'rgba(59,130,246,0.5)',
        href: '/agents/repurpose',
      },
    ],
  },
  {
    step: 3,
    label: 'Publish & Analyse',
    description: 'Schedule, post, and track performance',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500',
    agents: [
      {
        id: 'schedule',
        name: 'Schedule Agent',
        description: 'Get AI-optimised posting times and build your content queue.',
        icon: '🗓️',
        iconBg: 'bg-orange-100 dark:bg-orange-900/40',
        glow: 'rgba(249,115,22,0.07)',
        border: 'rgba(249,115,22,0.5)',
        href: '/agents/schedule',
      },
      {
        id: 'analytics',
        name: 'Analytics Agent',
        description: 'Understand your content performance and get AI-driven strategy recommendations.',
        icon: '📊',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
        glow: 'rgba(99,102,241,0.07)',
        border: 'rgba(99,102,241,0.5)',
        href: '/agents/analytics',
      },
      {
        id: 'comment-reply',
        name: 'Comment Reply',
        description: 'Generate on-brand replies to comments on your posts across platforms.',
        icon: '💬',
        iconBg: 'bg-pink-100 dark:bg-pink-900/40',
        glow: 'rgba(236,72,153,0.07)',
        border: 'rgba(236,72,153,0.5)',
        href: '/agents/comment-reply',
      },
    ],
  },
  {
    step: 4,
    label: 'Grow',
    description: 'Expand your reach through collaborations',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500',
    agents: [
      {
        id: 'influencer',
        name: 'Influencer Manager',
        description: 'Find ideal influencer collaborators and get personalised outreach DMs.',
        icon: '🌟',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
        glow: 'rgba(234,179,8,0.07)',
        border: 'rgba(234,179,8,0.5)',
        href: '/agents/influencer',
      },
      {
        id: 'collab',
        name: 'Collab & Outreach',
        description: 'Find collaboration partners and get personalised outreach messages for any collab type.',
        icon: '🤝',
        iconBg: 'bg-teal-100 dark:bg-teal-900/40',
        glow: 'rgba(20,184,166,0.07)',
        border: 'rgba(20,184,166,0.5)',
        href: '/agents/collab',
      },
    ],
  },
];

export default function AgentsPage() {
  return (
    <div className="max-w-4xl">

      <div className="mb-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Follow the workflow — discover trends, create content, publish it, and grow your audience.
        </p>
      </div>

      <div className="space-y-10">
        {groups.map((group) => (
          <div key={group.label}>

            {/* Group header */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`w-6 h-6 rounded-full ${group.bg} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-md`}
                style={{ boxShadow: `0 2px 8px ${group.bg.includes('emerald') ? 'rgba(16,185,129,0.4)' : group.bg.includes('indigo') ? 'rgba(99,102,241,0.4)' : group.bg.includes('orange') ? 'rgba(249,115,22,0.4)' : 'rgba(20,184,166,0.4)'}` }}
              >
                {group.step}
              </span>
              <h2 className={`text-sm font-bold ${group.color}`}>{group.label}</h2>
              <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
              <p className="text-xs text-gray-400 dark:text-gray-600 hidden sm:block">{group.description}</p>
            </div>

            {/* Agent cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={agent.href}
                  className="agent-card flex items-start gap-4 p-5"
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${agent.glow} 0%, transparent 65%)` }}
                  />
                  {/* Top shimmer */}
                  <div
                    className="absolute top-0 inset-x-0 h-px rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${agent.border}, transparent)` }}
                  />

                  <div className={`relative w-11 h-11 rounded-xl ${agent.iconBg} flex items-center justify-center text-2xl flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110`}>
                    {agent.icon}
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-gray-900 dark:text-white transition-colors duration-150 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {agent.name}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all duration-200 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{agent.description}</p>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
