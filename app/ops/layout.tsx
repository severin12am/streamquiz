import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ops',
  robots: { index: false, follow: false },
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#eef3ec', color: '#1d2b27' }}>{children}</div>
  );
}
