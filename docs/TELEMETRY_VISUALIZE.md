# WhoSmarter telemetry — hand this to an AI to visualize

**Purpose:** Paste this whole file (plus query results from Supabase) into ChatGPT / Claude / Grok and ask for charts, dashboards, or a written weekly summary.

**Where data lives:** Supabase project → table `telemetry_events` (SQL Editor or Table Editor).  
**Privacy:** Rows are anonymous product metrics only — no names, emails, IPs, topics, or account IDs.

---

## What each `event` means

| `event` | When it is written | Useful columns |
|---------|-------------------|----------------|
| `game_created` | Server, when a quiz is created | `platform`, `locale`, `difficulty`, `game_mode`, `mc_mode`, `cameras_on`, `num_questions` |
| `game_finished` | Host browser, when the match ends | `player_count`, same settings fields, `status` (`ended`) |
| `webrtc_summary` | Host browser at end of match | `webrtc_pairs_p2p`, `webrtc_pairs_relay`, `webrtc_pairs_failed`, `bytes_sent_total`, `bytes_recv_total` |
| `ice_config_served` | Server when ICE config is issued (sampled; always on Metered fallback) | `relay_provider` / `meta.relay_pool`: `coturn`, `metered`, `stun_only` |

### Vocabulary

- **platform:** `web` | `ios` | `unknown`
- **P2P / mesh:** peers connected without TURN (`webrtc_pairs_p2p`)
- **TURN relay:** media went through a relay server (`webrtc_pairs_relay`) — usually **your coturn**, or **Metered** if coturn was down when ICE was served
- **bytes_\*_total:** order-of-magnitude media volume, rounded to ~100 KB buckets (not billing-grade)

---

## How to pull data for the AI

1. Open **Supabase → SQL Editor**.
2. Run one or more queries below (or `SELECT * FROM telemetry_events ORDER BY created_at DESC LIMIT 500`).
3. Export CSV or copy the result table.
4. Paste into the AI with:  
   *“Visualize WhoSmarter product telemetry. Use the schema and meanings from the attached TELEMETRY_VISUALIZE.md. Build charts for creates over time, web vs iOS, difficulty/locale mix, players per game, and P2P vs TURN.”*

---

## Ready-made SQL (run in Supabase)

### 1) Raw recent rows

```sql
SELECT *
FROM telemetry_events
ORDER BY created_at DESC
LIMIT 200;
```

### 2) Quizzes created per day × platform

```sql
SELECT
  date_trunc('day', created_at) AS day,
  platform,
  COUNT(*) AS creates
FROM telemetry_events
WHERE event = 'game_created'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

### 3) Language × difficulty

```sql
SELECT locale, difficulty, COUNT(*) AS creates
FROM telemetry_events
WHERE event = 'game_created'
GROUP BY 1, 2
ORDER BY creates DESC;
```

### 4) Question count / mode / MC / cameras

```sql
SELECT
  num_questions,
  game_mode,
  mc_mode,
  cameras_on,
  COUNT(*) AS creates
FROM telemetry_events
WHERE event = 'game_created'
GROUP BY 1, 2, 3, 4
ORDER BY creates DESC;
```

### 5) Players at finish (distribution)

```sql
SELECT player_count, COUNT(*) AS games
FROM telemetry_events
WHERE event = 'game_finished'
GROUP BY 1
ORDER BY 1;
```

### 6) Average players + finish volume

```sql
SELECT
  COUNT(*) AS finished_games,
  ROUND(AVG(player_count)::numeric, 2) AS avg_players
FROM telemetry_events
WHERE event = 'game_finished';
```

### 7) WebRTC: P2P vs TURN vs failed

```sql
SELECT
  SUM(webrtc_pairs_p2p)   AS p2p_pairs,
  SUM(webrtc_pairs_relay) AS relay_pairs,
  SUM(webrtc_pairs_failed) AS failed_pairs,
  COUNT(*) AS summaries
FROM telemetry_events
WHERE event = 'webrtc_summary';
```

### 8) Approximate media bytes per week

```sql
SELECT
  date_trunc('week', created_at) AS week,
  SUM(COALESCE(bytes_sent_total, 0) + COALESCE(bytes_recv_total, 0)) AS approx_bytes
FROM telemetry_events
WHERE event = 'webrtc_summary'
GROUP BY 1
ORDER BY 1 DESC;
```

### 9) ICE pool served (coturn vs Metered vs stun-only)

```sql
SELECT
  COALESCE(relay_provider, meta->>'relay_pool') AS pool,
  COUNT(*) AS samples
FROM telemetry_events
WHERE event = 'ice_config_served'
GROUP BY 1
ORDER BY samples DESC;
```

### 10) Last 30 days overview (one table)

```sql
SELECT
  event,
  platform,
  COUNT(*) AS n
FROM telemetry_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 1, 2;
```

---

## Suggested charts for the AI

1. Line: creates per day, split by `platform`  
2. Pie/bar: locale share; difficulty share  
3. Histogram: `player_count` on `game_finished`  
4. Stacked bar: p2p vs relay pairs over weeks  
5. KPI cards: total creates, finish rate (finished / created if you join carefully), % iOS  
6. Callout: Metered fallback rate from `ice_config_served`

**Finish rate caveat:** `game_created` and `game_finished` both use `game_ref`. You can join:

```sql
SELECT
  c.platform,
  COUNT(DISTINCT c.game_ref) AS created,
  COUNT(DISTINCT f.game_ref) AS finished
FROM telemetry_events c
LEFT JOIN telemetry_events f
  ON f.event = 'game_finished' AND f.game_ref = c.game_ref
WHERE c.event = 'game_created'
GROUP BY 1;
```

---

## Prompt template (copy-paste)

```
You are a data visualization assistant.

I run a multiplayer quiz app (WhoSmarter). Below is:
1) The meaning of telemetry_events (from TELEMETRY_VISUALIZE.md)
2) SQL query results (CSV or tables)

Please:
- Summarize the last period in plain English
- Produce charts (or chart specs / Mermaid / ASCII if you can't render images)
- Highlight web vs iOS, language, difficulty, players per game
- Explain video path: P2P mesh vs TURN relay and any Metered fallback
- Flag anything surprising or sparse (low sample size)

Do not invent rows. If a metric is missing, say so.
```

Then paste query results underneath.

---

## What not to ask the AI to do

- Infer real identities from `game_ref`  
- Treat rounded bytes as exact billing  
- Assume every create has a finish (users abandon lobbies)

---

*Data source: WhoSmarter `telemetry_events`. Full design: `docs/ANALYTICS.md`.*
