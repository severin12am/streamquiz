'use client';

import OpsGate from '@/components/ops-map/OpsGate';
import OpsMapApp from '@/components/ops-map/OpsMapApp';
import { useOpsSecret } from '@/components/ops-map/useOpsSecret';
import { buildDemoPackets } from '@/lib/ops-map/demo-packets';

const DEMO = buildDemoPackets();

export default function StudioClient() {
  const { draft, setDraft, unlocked, ready, unlock } = useOpsSecret();

  if (!ready) return null;
  if (!unlocked) {
    return (
      <OpsGate
        title="Studio"
        lead="A map of how WhoSmarter actually runs — flows, modules, inspectable demo packets."
        draft={draft}
        onDraft={setDraft}
        onUnlock={unlock}
      />
    );
  }

  return (
    <OpsMapApp
      mode="studio"
      packets={DEMO}
      banner="Scripted packets, not live users. Open Sessions to replay telemetry_events."
    />
  );
}
