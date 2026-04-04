import { currentUser } from '@clerk/nextjs/server';
import { Suspense } from 'react';
import RecentContent from '@/components/content/RecentContent';
import RecentPosts from '@/components/content/RecentPosts';
import AnalyticsSummary from '@/components/analytics/AnalyticsSummary';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? 'there';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
            {greeting},{' '}
            <span className="text-gradient-brand">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            What would you like to create today?
          </p>
        </div>
        <Link
          href="/agents"
          className="btn-primary text-sm flex-shrink-0 hidden sm:flex"
        >
          All Agents <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Agent grid ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Agents</h2>
          <Link href="/agents" className="section-link">View all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {agents.map((agent) => (
            <a
              key={agent.id}
              href={agent.href}
              className="agent-card"
            >
              {/* Gradient glow overlay on hover */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(135deg, ${agent.glow} 0%, transparent 65%)` }}
              />
              {/* Top shimmer line on hover */}
              <div
                className="absolute top-0 inset-x-0 h-px rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${agent.borderColor}, transparent)` }}
              />

              <div className={`relative w-10 h-10 rounded-xl ${agent.iconBg} flex items-center justify-center text-xl mb-3 transition-transform duration-300 group-hover:scale-110`}>
                {agent.icon}
              </div>
              <p className="relative text-sm font-semibold text-gray-900 dark:text-white mb-1 leading-tight transition-colors duration-150 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {agent.name}
              </p>
              <p className="relative text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
                {agent.description}
              </p>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Analytics summary ── */}
      <section>
        <AnalyticsSummary />
      </section>

      {/* ── Recent content ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="section-header">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Content</h2>
            <Link href="/content" className="section-link">View all →</Link>
          </div>
          <Suspense fallback={<SkeletonList />}>
            <RecentContent />
          </Suspense>
        </div>
        <div>
          <div className="section-header">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recently Posted</h2>
            <Link href="/history" className="section-link">View all →</Link>
          </div>
          <RecentPosts />
        </div>
      </section>

    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[1,2,3].map(i => (
        <div key={i} className="card h-16 shimmer" />
      ))}
    </div>
  );
}

const agents = [
  {
    id: 'trends',
    name: 'Trend Agent',
    description: 'Discover trending topics.',
    icon: '📈',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    glow: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.6)',
    href: '/agents/trends',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    description: 'Scripts, threads & blogs.',
    icon: '✏️',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    glow: 'rgba(99,102,241,0.08)',
    borderColor: 'rgba(99,102,241,0.6)',
    href: '/agents/content-writer',
  },
  {
    id: 'caption',
    name: 'Caption Agent',
    description: 'Platform captions + hashtags.',
    icon: '✍️',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    glow: 'rgba(139,92,246,0.08)',
    borderColor: 'rgba(139,92,246,0.6)',
    href: '/agents/caption',
  },
  {
    id: 'image-generator',
    name: 'Image Generator',
    description: 'AI visuals from text.',
    icon: '🖼️',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    glow: 'rgba(236,72,153,0.08)',
    borderColor: 'rgba(236,72,153,0.6)',
    href: '/agents/image-generator',
  },
  {
    id: 'repurpose',
    name: 'Repurposing',
    description: 'Transform across platforms.',
    icon: '🔄',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    glow: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.6)',
    href: '/agents/repurpose',
  },
  {
    id: 'schedule',
    name: 'Schedule Agent',
    description: 'AI-optimised post times.',
    icon: '🗓️',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    glow: 'rgba(249,115,22,0.08)',
    borderColor: 'rgba(249,115,22,0.6)',
    href: '/agents/schedule',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Performance & strategy.',
    icon: '📊',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    glow: 'rgba(99,102,241,0.08)',
    borderColor: 'rgba(99,102,241,0.6)',
    href: '/agents/analytics',
  },
  {
    id: 'comment-reply',
    name: 'Comment Reply',
    description: 'On-brand replies.',
    icon: '💬',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    glow: 'rgba(236,72,153,0.08)',
    borderColor: 'rgba(236,72,153,0.6)',
    href: '/agents/comment-reply',
  },
  {
    id: 'influencer',
    name: 'Influencer Mgr',
    description: 'Find collaborators.',
    icon: '🌟',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    glow: 'rgba(234,179,8,0.08)',
    borderColor: 'rgba(234,179,8,0.6)',
    href: '/agents/influencer',
  },
  {
    id: 'collab',
    name: 'Collab & Outreach',
    description: 'Personalised messages.',
    icon: '🤝',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    glow: 'rgba(20,184,166,0.08)',
    borderColor: 'rgba(20,184,166,0.6)',
    href: '/agents/collab',
  },
];
