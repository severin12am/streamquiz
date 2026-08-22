import type { Metadata } from 'next';
import TelemetryDashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Ops — Telemetry',
  robots: { index: false, follow: false },
};

export default function OpsTelemetryPage() {
  return <TelemetryDashboardClient />;
}
