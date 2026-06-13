// ============================================================
// Game Page — The actual quiz screen
//
// URL structure:
//   /game/[id]?role=host    → Host view  (you)
//   /game/[id]              → Guest view (share link for players)
//
// Both roles render the exact same GameScreen component.
// The role prop is passed down to determine:
//   - Which camera is local vs remote
//   - Who sees the judge buttons
//   - Who drives the timer transitions
//
// This is a Server Component — it reads the searchParams and
// passes them to the client-side GameScreen component.
// ============================================================

import GameScreen from '@/components/GameScreen';
import type { PlayerRole } from '@/lib/types';

interface GamePageProps {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { id }   = await params;
  const { role } = await searchParams;

  // Determine role from URL param.
  // Only ?role=host makes someone the host. Everything else → player.
  const playerRole: PlayerRole = role === 'host' ? 'host' : 'player';

  return <GameScreen gameId={id} role={playerRole} />;
}
