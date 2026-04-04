import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthTokenSync from '@/components/AuthTokenSync';
import CommandPaletteProvider from '@/components/ui/CommandPaletteProvider';
import FloatingActions from '@/components/ui/FloatingActions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/auth/sign-in');

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--page-bg)' }}>
      <AuthTokenSync />
      <CommandPaletteProvider />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-none">
          <div className="p-5 md:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
          <FloatingActions />
        </main>
      </div>
    </div>
  );
}
