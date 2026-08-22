// ============================================================
// Ops isometric map — shared types (studio + session replay).
// Packets are anonymous: no names, emails, IPs, or topics.
// ============================================================

export type OpsMode = 'studio' | 'sessions';

export type OpsZone = {
  id: string;
  name: string;
  gx: number;
  gz: number;
  w: number;
  d: number;
};

export type OpsModule = {
  id: string;
  code: string;
  name: string;
  zoneId: string;
  gx: number;
  gz: number;
  w: number;
  d: number;
  files: string[];
  summary: string;
  payloadTags: string[];
};

export type OpsFlow = {
  id: string;
  name: string;
  hops: string[];
  summary: string;
};

export type OpsPacketPayload = Record<string, string | number | boolean | null>;

export type OpsPacket = {
  id: string;
  flowId: string;
  hops: string[];
  /** Spawn time on the 0–1 playback timeline. */
  t: number;
  label: string;
  event: string;
  at?: string;
  tags: string[];
  payload: OpsPacketPayload;
  demo?: boolean;
};

export type IsoPoint = { x: number; y: number };
