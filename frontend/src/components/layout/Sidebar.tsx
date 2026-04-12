'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Wand2,
  FileText,
  TrendingUp,
  BarChart2,
  CheckSquare,
  Settings,
  ChevronLeft,
  CalendarDays,
  Workflow,
} from 'lucide-react';
import Image from 'next/image';
import apiClient from '@/lib/apiClient';

const navItems = [
  { href: '/dashboard',        label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pipeline',         label: 'Pipeline',   icon: Workflow },
  { href: '/agents',           label: 'Agents',     icon: Wand2 },
  { href: '/content',          label: 'My Content', icon: FileText },
  { href: '/history',          label: 'Posted',     icon: CheckSquare },
  { href: '/calendar',         label: 'Calendar',   icon: CalendarDays },
  { href: '/trends',           label: 'Trends',     icon: TrendingUp },
  { href: '/agents/analytics', label: 'Analytics',  icon: BarChart2 },
  { href: '/settings',         label: 'Settings',   icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [activeBrand, setActiveBrand] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    apiClient.get('/api/v1/brands/active')
      .then(({ data }) => { if (data?.name) setActiveBrand({ name: data.name }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onBrandActivated(e: CustomEvent) {
      if (e.detail?.name) setActiveBrand({ name: e.detail.name });
    }
    window.addEventListener('brand-activated', onBrandActivated as EventListener);
    return () => window.removeEventListener('brand-activated', onBrandActivated as EventListener);
  }, []);

  function toggle() {
    setCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  }

  return (
    <div
      className={clsx(
        'relative flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
        'bg-white border-r border-gray-100/80',
        'dark:border-r dark:border-white/[0.05]',
        collapsed ? 'w-[60px]' : 'w-60'
      )}
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      {/* Top shimmer line (dark only) */}
      <div className="absolute top-0 inset-x-0 h-px hidden dark:block"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />

      {/* Logo + toggle */}
      <div className={clsx(
        'flex items-center flex-shrink-0 h-14 border-b border-gray-100/80 dark:border-white/[0.05]',
        collapsed ? 'px-3 justify-center' : 'px-4 gap-3'
      )}>
        {collapsed ? (
          <button onClick={toggle} title="Expand sidebar" className="hover:opacity-80 transition-opacity">
            <Image src="/paavox-icon.png" alt="Paavox" width={30} height={30} className="rounded-xl" />
          </button>
        ) : (
          <>
            <Image src="/paavox-icon.png" alt="Paavox" width={30} height={30} className="rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-gray-900 dark:text-white whitespace-nowrap leading-tight text-[15px] tracking-tight">
                  Paavox
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                  Beta
                </span>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-indigo-400/70 whitespace-nowrap tracking-[0.18em] uppercase font-semibold">
                content ai
              </p>
            </div>
            <button
              onClick={toggle}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all flex-shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={clsx('flex-1 overflow-y-auto scrollbar-none py-3', collapsed ? 'px-2 space-y-1' : 'px-3 space-y-0.5')}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (pathname.startsWith(href + '/') &&
              !navItems.some(
                item => item.href !== href && (pathname === item.href || pathname.startsWith(item.href + '/'))
              ));

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'relative flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
              )}
              style={active ? {
                color: 'rgb(99,102,241)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)',
              } : undefined}
            >
              {/* Left active border (light mode) */}
              {active && !collapsed && (
                <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r bg-indigo-500 dark:hidden" />
              )}
              {/* Left active glow (dark mode) */}
              {active && !collapsed && (
                <span className="absolute left-0 inset-y-0 w-0.5 rounded-r hidden dark:block"
                  style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.8), rgba(139,92,246,0.6))', filter: 'blur(0.5px)' }} />
              )}

              <span
                className={clsx(
                  'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-150',
                  !active && 'hover:opacity-100'
                )}
                style={{ background: 'rgba(0,0,0,0.04)' }}
                aria-hidden
              />

              {!active && (
                <span className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-150 dark:block hidden"
                  style={{ background: 'rgba(255,255,255,0.035)' }} aria-hidden />
              )}

              <Icon className={clsx(
                'flex-shrink-0 transition-all duration-150',
                collapsed ? 'w-5 h-5' : 'w-4 h-4',
                active ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-500'
              )} />
              {!collapsed && (
                <span className={clsx(
                  'whitespace-nowrap transition-colors duration-150',
                  active ? 'text-indigo-600 dark:text-indigo-300 font-semibold' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Active Brand */}
      {activeBrand && (
        <div className="border-t border-gray-100/80 dark:border-white/[0.05]">
          <Link
            href="/settings"
            title={collapsed ? `Active brand: ${activeBrand.name}` : undefined}
            className={clsx(
              'flex items-center gap-2.5 transition-all hover:bg-gray-50 dark:hover:bg-white/[0.03]',
              collapsed ? 'p-3 justify-center' : 'px-4 py-2.5'
            )}
          >
            <span className="relative flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500"
                style={{ boxShadow: '0 0 6px rgba(16,185,129,0.8)', animation: 'glow-pulse 2s ease-in-out infinite' }} />
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.14em] leading-none mb-0.5">Active Brand</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{activeBrand.name}</p>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* User */}
      <div className={clsx(
        'border-t border-gray-100/80 dark:border-white/[0.05] flex items-center flex-shrink-0',
        collapsed ? 'p-3 justify-center' : 'p-4 gap-3'
      )}>
        <UserButton afterSignOutUrl="/auth/sign-in" />
        {!collapsed && (
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Account</span>
        )}
      </div>
    </div>
  );
}
