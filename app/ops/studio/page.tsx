import type { Metadata } from 'next';
import StudioClient from './StudioClient';

export const metadata: Metadata = {
  title: 'Ops — Studio',
  robots: { index: false, follow: false },
};

export default function OpsStudioPage() {
  return <StudioClient />;
}
