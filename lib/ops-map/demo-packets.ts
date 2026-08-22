import { OPS_FLOWS } from './architecture';
import type { OpsPacket } from './types';

const SAMPLES: Omit<OpsPacket, 'id' | 't' | 'hops' | 'flowId'>[][] = [
  [
    {
      label: 'create quiz',
      event: 'game_created',
      tags: ['GAME CONFIG'],
      payload: {
        platform: 'web',
        locale: 'en',
        difficulty: 'medium',
        game_mode: 'think',
        mc_mode: true,
        cameras_on: false,
        num_questions: 5,
        is_public: false,
      },
    },
    {
      label: 'questions ready',
      event: 'questions_generated',
      tags: ['PROMPT', 'MODEL'],
      payload: {
        provider: 'xai',
        count: 5,
        mc_mode: true,
        note: 'Demo packet — live telemetry does not store topic text.',
      },
    },
  ],
  [
    {
      label: 'claim seat',
      event: 'player_joined',
      tags: ['SEAT', 'ROSTER'],
      payload: { slot: 2, role: 'player', note: 'Demo. Live telemetry does not store names.' },
    },
  ],
  [
    {
      label: 'MC pick',
      event: 'round_mc',
      tags: ['PICK', 'PHASE'],
      payload: { phase: 'question', mc_index: 2, correct: true, score_delta: 1 },
    },
  ],
  [
    {
      label: 'voice judge',
      event: 'round_voice',
      tags: ['VERDICT', 'MODEL'],
      payload: { method: 'local', correct: true, note: 'Transcripts are never written to telemetry.' },
    },
  ],
  [
    {
      label: 'ICE served',
      event: 'ice_config_served',
      tags: ['ICE POOL'],
      payload: { relay_pool: 'coturn', platform: 'web' },
    },
    {
      label: 'mesh summary',
      event: 'webrtc_summary',
      tags: ['MESH STATS'],
      payload: {
        webrtc_pairs_p2p: 3,
        webrtc_pairs_relay: 0,
        webrtc_pairs_failed: 0,
        path: 'p2p',
        bytes_sent_total: 2_400_000,
      },
    },
  ],
  [
    {
      label: 'match ended',
      event: 'game_finished',
      tags: ['EVENT', 'SCORE'],
      payload: { player_count: 4, status: 'ended', platform: 'web', cameras_on: false },
    },
  ],
  [
    {
      label: 'open listing',
      event: 'public_browse',
      tags: ['PUBLIC'],
      payload: { listed_waiting: 3, note: 'Demo. Listing itself is not a telemetry event yet.' },
    },
  ],
  [
    {
      label: 'checkout',
      event: 'billing_checkout',
      tags: ['BILLING', 'QUOTA'],
      payload: { note: 'Demo. Stripe events are not copied into telemetry_events.' },
    },
  ],
];

/** Scripted packets so Studio works with zero live data. */
export function buildDemoPackets(): OpsPacket[] {
  const packets: OpsPacket[] = [];
  const n = OPS_FLOWS.length;
  OPS_FLOWS.forEach((flow, fi) => {
    const samples = SAMPLES[fi] ?? SAMPLES[0];
    samples.forEach((sample, si) => {
      packets.push({
        ...sample,
        id: `demo-${flow.id}-${si}`,
        flowId: flow.id,
        hops: flow.hops,
        t: (fi + (si + 1) / (samples.length + 1)) / (n + 0.35),
        demo: true,
      });
    });
  });
  return packets;
}
