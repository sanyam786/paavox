'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play, CheckCircle2, Clock, Trash2, Loader2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';

interface Pipeline {
  id: string;
  name: string;
  status: 'in_progress' | 'completed';
  current_step: number;
  topic: string;
  content_format: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

const STEPS = ['Topic', 'Content', 'Caption & Image', 'Review'];

const STEP_COLORS = [
  'bg-violet-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-green-500',
];

function StepDots({ currentStep, status }: { currentStep: number; status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((label, i) => {
        const done = status === 'completed' || i < currentStep;
        const active = i === currentStep && status === 'in_progress';
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div
              title={label}
              className={`w-2 h-2 rounded-full transition-colors ${
                done
                  ? 'bg-green-500'
                  : active
                  ? STEP_COLORS[i]
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px ${done ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PipelinePage() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/api/v1/pipeline/')
      .then(({ data }) => setPipelines(data))
      .catch(() => toast.error('Failed to load pipelines.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleNew() {
    setCreating(true);
    try {
      const { data } = await apiClient.post('/api/v1/pipeline/', { name: 'New Pipeline' });
      router.push(`/pipeline/${data.id}`);
    } catch {
      toast.error('Failed to create pipeline.');
      setCreating(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/v1/pipeline/${id}`);
      setPipelines(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error('Failed to delete pipeline.');
    } finally {
      setDeletingId(null);
    }
  }

  const inProgress = pipelines.filter(p => p.status === 'in_progress');
  const completed = pipelines.filter(p => p.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Pipelines</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            End-to-end content workflows — topic → content → caption & image → publish
          </p>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          className="btn-primary flex items-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New Pipeline
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 h-24 animate-pulse bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-3xl mb-4">🚀</div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No pipelines yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">
            Create your first pipeline to go from topic discovery to publishing in one guided flow.
          </p>
          <button onClick={handleNew} disabled={creating} className="btn-primary flex items-center gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Start your first pipeline
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* In Progress */}
          {inProgress.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> In Progress
              </h2>
              <div className="space-y-3">
                {inProgress.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/pipeline/${p.id}`)}
                    className="card p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-brand-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                          <span className="text-xs bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Step {p.current_step + 1} of {STEPS.length} · {STEPS[p.current_step]}
                          </span>
                        </div>
                        {p.topic && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-3">
                            📝 {p.topic}
                          </p>
                        )}
                        <StepDots currentStep={p.current_step} status={p.status} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">{timeAgo(p.updated_at)}</span>
                        <button
                          onClick={e => handleDelete(p.id, e)}
                          disabled={deletingId === p.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                        <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </h2>
              <div className="space-y-3">
                {completed.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/pipeline/${p.id}`)}
                    className="card p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 opacity-80 hover:opacity-100 border-l-4 border-l-green-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                          <span className="text-xs bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Completed
                          </span>
                        </div>
                        {p.topic && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-3">
                            📝 {p.topic}
                          </p>
                        )}
                        <StepDots currentStep={4} status="completed" />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">{timeAgo(p.updated_at)}</span>
                        <button
                          onClick={e => handleDelete(p.id, e)}
                          disabled={deletingId === p.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
