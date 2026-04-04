'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, CalendarDays, Send, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import apiClient from '@/lib/apiClient';

interface Overview {
  total_content: number;
  total_scheduled: number;
  total_posted: number;
  total_agent_runs: number;
  weekly_activity: { week: string; count: number }[];
  weekly_posted: { week: string; count: number }[];
}

const BAR_MAX_PX = 44;

function MiniBar({ data, gradient }: { data: { week: string; count: number }[]; gradient: string }) {
  const max = Math.max(...data.map(w => w.count), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: `${BAR_MAX_PX + 4}px` }}>
      {data.map((w, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-300"
          style={{
            height: `${Math.max((w.count / max) * BAR_MAX_PX, w.count > 0 ? 4 : 2)}px`,
            background: gradient,
            opacity: w.count === 0 ? 0.15 : 0.85,
          }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsSummary() {
  const [data, setData]     = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/analytics/overview')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-5 space-y-4">
        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'Generated',
      value: data.total_content,
      icon: FileText,
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      glow: 'rgba(99,102,241,0.3)',
    },
    {
      label: 'Scheduled',
      value: data.total_scheduled,
      icon: CalendarDays,
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      glow: 'rgba(249,115,22,0.3)',
    },
    {
      label: 'Published',
      value: data.total_posted,
      icon: Send,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      glow: 'rgba(16,185,129,0.3)',
    },
    {
      label: 'Agent Runs',
      value: data.total_agent_runs,
      icon: Zap,
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      glow: 'rgba(139,92,246,0.3)',
    },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Analytics Overview</h2>
        </div>
        <Link
          href="/agents/analytics"
          className="section-link flex items-center gap-1"
        >
          Full report <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-4 group hover:border-indigo-200 dark:hover:border-white/10 transition-all duration-200"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
              style={{ background: `radial-gradient(circle at 0% 100%, ${s.glow.replace('0.3', '0.05')}, transparent 70%)` }}
            />
            <div
              className="stat-card-icon w-9 h-9 text-base mb-3"
              style={{ background: s.gradient, boxShadow: `0 4px 12px ${s.glow}` }}
            >
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none mb-1 animate-count-up">
              {s.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mini charts */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Created (8 weeks)</p>
          <MiniBar
            data={data.weekly_activity}
            gradient="linear-gradient(to top, #6366f1, #818cf8)"
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Published (8 weeks)</p>
          <MiniBar
            data={data.weekly_posted}
            gradient="linear-gradient(to top, #10b981, #34d399)"
          />
        </div>
      </div>
    </div>
  );
}
