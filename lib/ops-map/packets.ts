import { FLOW_BY_ID } from './architecture';
import type { OpsPacket, OpsPacketPayload } from './types';

export type TelemetryPacketRow = {
  event: string;
  created_at: string;
  platform: string | null;
  locale: string | null;
  difficulty: string | null;
  game_mode?: string | null;
  mc_mode?: boolean | null;
  cameras_on?: boolean | null;
  num_questions?: number | null;
  player_count: number | null;
  is_public?: boolean | null;
  status?: string | null;
  webrtc_pairs_total?: number | null;
  webrtc_pairs_p2p: number | null;
  webrtc_pairs_relay: number | null;
  webrtc_pairs_failed: number | null;
  relay_provider: string | null;
  bytes_sent_total: number | null;
  bytes_recv_total: number | null;
  cameras_enabled_mesh?: boolean | null;
  meta: Record<string, unknown> | null;
};

export const MAX_MAP_PACKETS = 80;

export function telemetryRowsToPackets(
  rows: TelemetryPacketRow[],
  rangeStartMs: number,
  rangeEndMs: number,
): OpsPacket[] {
  const span = Math.max(1, rangeEndMs - rangeStartMs);
  const interesting = rows.filter((r) =>
    r.event === 'game_created' ||
    r.event === 'game_started' ||
    r.event === 'game_finished' ||
    r.event === 'webrtc_summary' ||
    r.event === 'ice_config_served' ||
    r.event === 'player_joined' ||
    r.event === 'checkout_started' ||
    r.event === 'checkout_completed' ||
    r.event === 'quota_exceeded',
  );
  const slice = interesting.slice(-MAX_MAP_PACKETS);

  return slice.map((row, i) => {
    const routed = routeTelemetryRow(row);
    const atMs = new Date(row.created_at).getTime();
    const t = Math.min(1, Math.max(0, (atMs - rangeStartMs) / span));
    return {
      id: `${row.event}-${row.created_at}-${i}`,
      flowId: routed.flowId,
      hops: routed.hops,
      t,
      label: row.event.replace(/_/g, ' '),
      event: row.event,
      at: row.created_at,
      tags: tagsFor(row),
      payload: payloadFor(row),
    };
  });
}

export function moduleHitsFromPackets(packets: OpsPacket[]): Record<string, number> {
  const hits: Record<string, number> = {};
  for (const p of packets) {
    for (const hop of p.hops) {
      hits[hop] = (hits[hop] ?? 0) + 1;
    }
  }
  return hits;
}

function routeTelemetryRow(row: TelemetryPacketRow): { flowId: string; hops: string[] } {
  switch (row.event) {
    case 'game_created': {
      const create = FLOW_BY_ID.create;
      if (row.is_public) {
        return { flowId: 'public', hops: FLOW_BY_ID.public.hops };
      }
      return { flowId: 'create', hops: create.hops };
    }
    case 'game_started':
      return { flowId: 'play', hops: ['lobby', 'gamescreen', 'state'] };
    case 'player_joined':
      return { flowId: 'public', hops: FLOW_BY_ID.public.hops };
    case 'checkout_started':
    case 'checkout_completed':
    case 'quota_exceeded':
      return { flowId: 'upgrade', hops: FLOW_BY_ID.upgrade.hops };
    case 'game_finished':
      return { flowId: 'finish', hops: FLOW_BY_ID.finish.hops };
    case 'ice_config_served': {
      const pool = relayPool(row);
      const hops =
        pool === 'stun_only'
          ? ['gamescreen', 'mesh', 'ice']
          : FLOW_BY_ID.webrtc.hops;
      return { flowId: 'webrtc', hops };
    }
    case 'webrtc_summary': {
      const relay = row.webrtc_pairs_relay ?? 0;
      const hops = relay > 0 ? FLOW_BY_ID.webrtc.hops : ['gamescreen', 'cameras', 'mesh'];
      return { flowId: 'webrtc', hops };
    }
    default:
      return { flowId: 'create', hops: FLOW_BY_ID.create.hops };
  }
}

function relayPool(row: TelemetryPacketRow): string {
  if (typeof row.relay_provider === 'string' && row.relay_provider) return row.relay_provider;
  const meta = row.meta?.relay_pool;
  return typeof meta === 'string' ? meta : 'unknown';
}

function tagsFor(row: TelemetryPacketRow): string[] {
  switch (row.event) {
    case 'game_created':
      return ['GAME CONFIG', 'EVENT'];
    case 'game_finished':
      return ['EVENT', 'SCORE'];
    case 'ice_config_served':
      return ['ICE POOL'];
    case 'webrtc_summary':
      return ['MESH STATS', row.webrtc_pairs_relay ? 'RELAY' : 'P2P'];
    default:
      return ['EVENT'];
  }
}

function payloadFor(row: TelemetryPacketRow): OpsPacketPayload {
  const payload: OpsPacketPayload = {
    event: row.event,
    platform: row.platform,
  };
  if (row.locale) payload.locale = row.locale;
  if (row.difficulty) payload.difficulty = row.difficulty;
  if (row.game_mode) payload.game_mode = row.game_mode;
  if (row.mc_mode != null) payload.mc_mode = row.mc_mode;
  if (row.cameras_on != null) payload.cameras_on = row.cameras_on;
  if (row.num_questions != null) payload.num_questions = row.num_questions;
  if (row.player_count != null) payload.player_count = row.player_count;
  if (row.is_public != null) payload.is_public = row.is_public;
  if (row.status) payload.status = row.status;
  if (row.event === 'ice_config_served') payload.relay_pool = relayPool(row);
  if (row.webrtc_pairs_p2p != null) payload.webrtc_pairs_p2p = row.webrtc_pairs_p2p;
  if (row.webrtc_pairs_relay != null) payload.webrtc_pairs_relay = row.webrtc_pairs_relay;
  if (row.webrtc_pairs_failed != null) payload.webrtc_pairs_failed = row.webrtc_pairs_failed;
  if (row.bytes_sent_total != null) payload.bytes_sent_total = row.bytes_sent_total;
  if (row.bytes_recv_total != null) payload.bytes_recv_total = row.bytes_recv_total;
  return payload;
}
