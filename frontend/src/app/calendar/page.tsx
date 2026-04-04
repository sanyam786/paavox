'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Plus } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  twitter: '🐦',
  linkedin: '💼',
  tiktok: '🎵',
  youtube: '▶️',
  facebook: '👥',
};

const TYPE_COLORS: Record<string, string> = {
  caption:        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  repurposed:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'trend-based':  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  written:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  scheduled:      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  image:          'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  pipeline:       'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border-brand-200 dark:border-brand-800',
};

const TYPE_LABELS: Record<string, string> = {
  caption:       'Caption',
  repurposed:    'Repurposed',
  'trend-based': 'Trend',
  written:       'Written',
  scheduled:     'Scheduled',
  image:         'Image',
  pipeline:      'Pipeline',
};

interface ContentItem {
  id: string;
  platform: string;
  type: string;
  content: string;
  hashtags: string[];
  image_url?: string;
  pipeline_id?: string;
  created_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function snippet(text: string, max = 60) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function pillLabel(item: ContentItem, max = 25): string {
  if (item.type === 'image') return '🖼️ Image';
  if (item.type === 'pipeline') return `🚀 ${snippet(item.content, max)}`;
  return snippet(item.content, max);
}

function parseMediaUrls(item: ContentItem): string[] {
  const raw = item.image_url || (item.type === 'image' ? item.content : '');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch { return [raw]; }
}

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay()); // Sunday
  result.setHours(0, 0, 0, 0);
  return result;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [view, setView]         = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [items, setItems]       = useState<ContentItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<ContentItem | null>(null);

  useEffect(() => {
    apiClient.get('/api/v1/content/')
      .then(r => setItems(r.data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function prevWeek() {
    setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d; });
  }
  function nextWeek() {
    setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d; });
  }

  const calDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  // Map items by date string for O(1) lookup
  const itemsByDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const item of items) {
      const d = new Date(item.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  function getItemsForDay(date: Date) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return itemsByDate[key] ?? [];
  }

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-1/4 animate-pulse mb-6" />
        <div className="card h-[500px] animate-pulse bg-gray-50 dark:bg-gray-800/50" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Calendar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">All your created content at a glance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === 'month'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === 'week'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Week
            </button>
          </div>
          <Link href="/agents/content-writer" className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Create content
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mr-1">Type:</p>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <span key={type} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[type]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={view === 'week' ? prevWeek : prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {view === 'week' ? (() => {
            const end = weekDays[6];
            const sameMonth = weekStart.getMonth() === end.getMonth();
            return sameMonth
              ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`
              : `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
          })() : `${MONTHS[month]} ${year}`}
        </h2>
        <button
          onClick={view === 'week' ? nextWeek : nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <div className="card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-700">
            {calDays.map((date, i) => {
              const dayItems = date ? getItemsForDay(date) : [];
              const isToday  = date ? isSameDay(date, today) : false;
              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-1.5 border-b border-gray-100 dark:border-gray-700 ${
                    !date ? 'bg-gray-50/50 dark:bg-gray-800/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/20'
                  }`}
                >
                  {date && (
                    <>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1 ${
                        isToday
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {date.getDate()}
                      </span>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map(item => (
                          <button
                            key={item.id}
                            onClick={() => setSelected(item)}
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate transition-opacity hover:opacity-80 ${
                              TYPE_COLORS[item.type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {PLATFORM_ICONS[item.platform] ?? '🌐'} {pillLabel(item, 25)}
                          </button>
                        ))}
                        {dayItems.length > 3 && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">
                            +{dayItems.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-700">
            {weekDays.map((date, i) => {
              const dayItems = getItemsForDay(date);
              const isToday  = isSameDay(date, today);
              return (
                <div key={i} className="min-h-[300px]">
                  <div className={`py-3 text-center border-b border-gray-100 dark:border-gray-700 ${
                    isToday ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{DAYS[i]}</p>
                    <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {dayItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`w-full text-left text-xs font-medium px-2 py-1.5 rounded-lg border transition-opacity hover:opacity-80 ${
                          TYPE_COLORS[item.type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <span className="block">{PLATFORM_ICONS[item.platform] ?? '🌐'} {TYPE_LABELS[item.type] ?? item.type}</span>
                        <span className="block text-[10px] opacity-70 mt-0.5 font-normal truncate">{pillLabel(item, 40)}</span>
                      </button>
                    ))}
                    {dayItems.length === 0 && (
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center pt-4">No content</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="card w-full max-w-lg p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{PLATFORM_ICONS[selected.platform] ?? '🌐'}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">{selected.platform}</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[selected.type] ?? ''}`}>
                    {TYPE_LABELS[selected.type] ?? selected.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {/* Image or text content */}
            {(() => {
              const urls = parseMediaUrls(selected);
              if (urls.length > 0) {
                return urls.length === 1 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={urls[0]} alt="Generated" className="w-full max-h-64 object-cover rounded-xl mb-3" />
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {urls.map((u, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img key={i} src={u} alt={`Slide ${i + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                    ))}
                  </div>
                );
              }
              return (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {selected.content}
                </p>
              );
            })()}

            {selected.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selected.hashtags.map(tag => (
                  <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Created {new Date(selected.created_at).toLocaleString()}
              </p>
              {selected.pipeline_id && (
                <Link
                  href={`/pipeline/${selected.pipeline_id}`}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  onClick={() => setSelected(null)}
                >
                  🚀 View pipeline →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
