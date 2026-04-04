import AppLayout from '@/components/layout/AppLayout';

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
