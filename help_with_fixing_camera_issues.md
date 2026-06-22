# Fixing P2P camera/video issues (port from the working web app)

This document explains how we made multi-party WebRTC video **robust** in the
web version of WhoSmarter, and exactly how to apply the same fixes to the iOS
app. The bug class is: **"each participant only sees their own camera"** /
**"video doesn't reconnect after backgrounding or reload."**

The web app and the iOS app share the **same backend and signaling model**
(Supabase Realtime: Broadcast for SDP/ICE, Presence for "who is here"), so the
architecture and the fixes transfer almost 1:1.

---

## 1. How the video system works (mental model)

It is a **full mesh**: every participant opens one `RTCPeerConnection` to every
other participant. For N people that's N-1 connections each.

```
getUserMedia (camera+mic)            ← local capture
        │
        ▼
join signaling channel  "webrtc:{gameId}"   ← Supabase Realtime
        │
   ┌────┴─────────────────────────────────────────┐
   │ PRESENCE (keyed by participantId)             │  ← "who is online now"
   │ BROADCAST event "signal" {from,to,payload}    │  ← routed SDP + ICE
   └────┬─────────────────────────────────────────┘
        ▼
for each other participant → RTCPeerConnection
   addTrack(localTracks)                ← send my media
   onnegotiationneeded → createOffer → setLocalDescription → send offer
   recv offer  → setRemoteDescription → createAnswer → send answer
   onicecandidate → send candidate;  recv candidate → addIceCandidate
   ontrack → got their MediaStream → attach to a <video> / RTCMTLVideoView
```

**Key point:** "I see my own video" is trivial — it's the local capture shown
locally, no network involved. "I don't see the other person" always means the
**peer connection / discovery / media path** to them didn't complete. Debug
that path, never the local preview.

### Identity

Each participant has a stable `participantId` (in our app the Supabase
`players.id` UUID). This id is used **consistently** for:
- the Presence key,
- the `from`/`to` fields on every signaling message,
- the dictionary key for remote streams and peer connections.

If these ever disagree, routing breaks. Keep ONE id everywhere.

---

## 2. Root cause of the bug we hit

Symptom: two people "in the same game", names/scores syncing live, but each only
saw their own camera. Forcing a reconnect/rematch fixed it.

Root cause: **peer discovery, not media.** One client (a phone that had
backgrounded/reopened the page) was **not present in the `webrtc:{gameId}`
channel**, so the other client had no peer to connect to. Two contributing
factors:

1. **Discovery was gated on the camera.** The app only joined Presence *after*
   `getUserMedia` succeeded. If the camera was slow / not yet permitted / the
   app was backgrounded, the client never announced itself, so it was invisible
   to everyone — even though game state (a *separate* realtime channel) kept
   syncing fine.

2. **Discovery was purely event-driven.** It only reacted to a Presence
   `join` event. If that event was missed (reload race, backgrounded socket),
   nothing ever retried, so the connection never formed.

Mobile makes both worse, because the OS aggressively suspends the camera, the
socket, and timers when the app is backgrounded, and nothing re-establishes
them on foreground unless you explicitly do so.

---

## 3. The robust solution — 5 principles

These are standard, battle-tested WebRTC patterns. None are web-specific.

### Principle 1 — Reconciliation, not event-driven connect (most important)

Don't think "on join event, connect." Think **declaratively**:

> *Desired state* = the set of participants currently present.
> *Actual state* = the set of peer connections I currently hold.
> Continuously make actual match desired.

Implement a `reconcile()` that:
- for every **present** peer with **no** connection → open one,
- for every connection to a peer **no longer present** → tear it down.

Run `reconcile()` **on every presence event AND on a repeating timer (~3s).**
Make "open a connection" **idempotent** (`ensurePeer(id)` returns the existing
one if present). Then calling reconcile a thousand times is harmless, and any
missed event self-corrects within one tick. This single change is what makes it
robust instead of flaky.

### Principle 2 — Presence is the source of truth for "who's here"

Presence is heartbeat-based: a client that crashes / reloads / backgrounds
auto-expires and reappears. Never keep a manual "is peer alive" flag — just read
presence and reconcile.

### Principle 3 — Perfect Negotiation (per pair)

When both sides try to offer at once you get "glare" and a stuck connection.
Fix it by giving each side a deterministic role:

- `polite = (myId < peerId)` — compare the two stable ids.
- On an **offer collision** (an incoming offer while we're making our own or
  not in `stable`): the **polite** side rolls back and accepts the remote offer;
  the **impolite** side ignores the incoming offer and keeps its own.

This guarantees exactly one side wins, no matter who started first.

### Principle 4 — Buffer ICE candidates until the remote description is set

ICE candidates routinely arrive **before** the SDP. If you drop them you get
one-way or missing video. Queue any candidate that arrives while
`remoteDescription == nil`, and flush the queue right after
`setRemoteDescription`.

### Principle 5 — Decouple discovery from capture, and recover on lifecycle/network changes

- **Decouple:** announce Presence and open connections as soon as you have an
  identity — do **not** wait for the camera. Add your media tracks **later**,
  when capture is ready; `addTrack` triggers renegotiation and your video
  starts flowing. This means peers find each other instantly, and a slow/denied
  camera never makes you invisible.
- **Recover:** when the app returns to foreground OR the network path changes,
  explicitly: restart capture → reconnect signaling → re-announce presence →
  reconcile → ICE-restart any unhealthy connection.

---

## 4. How the web app implements it (reference)

File: `hooks/useMeshWebRTC.ts`. The relevant pieces:

- `ensurePeer(peerId)` — idempotent; creates `RTCPeerConnection`, sets
  `polite = myId < peerId`, wires handlers, and calls `attachLocalTracks`.
- `attachLocalTracks(entry)` — adds local tracks **only if the camera is ready**
  and not already added (`entry.localTracksAdded`). Adding tracks fires
  `onnegotiationneeded`, which renegotiates automatically.
- A separate "camera-ready" effect — when `getUserMedia` resolves later, it
  calls `attachLocalTracks` for every already-open connection.
- `reconcile()` — opens/tears down connections to match Presence; called on
  every presence sync/join/leave **and** on a 3s `setInterval`.
- Perfect Negotiation in the broadcast handler: computes `offerCollision`,
  sets `ignoreOffer`, rolls back when polite.
- `pendingCandidates[]` — buffered ICE, flushed after `setRemoteDescription`.
- Recovery handler — on `visibilitychange` (visible) / `focus` / `online`:
  `startCamera()` (idempotent), re-`track()` presence, `reconcile()`.

The signaling message shape (identical for iOS):

```ts
type SignalType = 'offer' | 'answer' | 'ice-candidate';
interface WebRTCSignal {
  type: SignalType;
  from: string;   // sender participantId
  to:   string;   // recipient participantId
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}
```

Sent over Supabase Realtime: `channel.send({ type:'broadcast', event:'signal', payload })`.
Receivers ignore anything where `to !== myId` or `from === myId`.

---

## 5. iOS mapping (this is where the iOS bug almost certainly lives)

iOS suspends far more aggressively than a browser. Expect ALL of these and
handle them explicitly — none auto-recover:

| iOS behavior | Consequence | Fix |
|---|---|---|
| `AVCaptureSession` is **stopped** when app backgrounds (camera forbidden in background) | On foreground, capture does **not** auto-restart → you send no frames | Restart `RTCCameraVideoCapturer.startCapture(...)` on foreground |
| Signaling websocket is suspended/closed in background | Presence drops; not re-subscribed on foreground → peer never rediscovered | Reconnect signaling + re-announce presence on foreground |
| Network path change (Wi-Fi↔cellular, wake) | `RTCPeerConnection` → `disconnected`/`failed` | ICE restart |
| Timers suspended in background | reconcile pauses | Fire reconcile immediately in the recovery handler |
| Call / Control Center / split view | `AVCaptureSession` interruption | Observe interruption notifications, restart capture |

### 5.1 Idempotent peers + reconcile loop

```swift
final class MeshController {
    private var peers: [String: PeerConn] = [:]   // key = participantId
    private let myId: String

    func ensurePeer(_ id: String) -> PeerConn {
        if let existing = peers[id] { return existing }          // idempotent
        let pc = factory.peerConnection(with: rtcConfig,
                                        constraints: defaultConstraints,
                                        delegate: nil)!
        let conn = PeerConn(pc: pc,
                            polite: myId < id,                   // perfect negotiation
                            makingOffer: false,
                            ignoreOffer: false,
                            pendingCandidates: [],
                            localTracksAdded: false)
        conn.attachDelegate(self)
        peers[id] = conn
        attachLocalTracks(conn)        // adds nothing if capture not ready yet
        return conn
    }

    func reconcile(present: Set<String>) {
        for id in present where id != myId && peers[id] == nil { _ = ensurePeer(id) }
        for id in Array(peers.keys) where !present.contains(id) { teardown(id) }
    }

    func startReconcileLoop() {
        reconcileTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.reconcile(present: self.signaling.presentParticipantIds())
        }
    }
}
```

Also call `reconcile(present:)` from **every** presence callback
(sync/join/leave), not only the timer.

### 5.2 Decouple discovery from capture

Join signaling + presence as soon as you have `gameId` + `myId`. Do **not**
wait for `AVCaptureSession`. Add tracks when capture is ready:

```swift
// Called once we have identity (NOT after the camera):
func joinSignaling() {
    signaling.subscribe(topic: "webrtc:\(gameId)")
    signaling.trackPresence(id: myId)
    startReconcileLoop()
}

// Idempotent — safe to call repeatedly / before capture is ready.
func attachLocalTracks(_ conn: PeerConn) {
    guard let audio = localAudioTrack, !conn.localTracksAdded else { return }
    conn.pc.add(audio, streamIds: ["local"])
    if let video = localVideoTrack { conn.pc.add(video, streamIds: ["local"]) }
    conn.localTracksAdded = true
    // adding tracks triggers negotiation in your shouldNegotiate handler
}

// When AVCaptureSession finally produces tracks:
func onCaptureReady() {
    peers.values.forEach { attachLocalTracks($0) }   // renegotiates open conns
}
```

### 5.3 Perfect Negotiation (RTCPeerConnectionDelegate)

```swift
func peerConnectionShouldNegotiate(_ pc: RTCPeerConnection) {
    let conn = lookup(pc)
    conn.makingOffer = true
    let cons = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
    pc.offer(for: cons) { [weak self] sdp, _ in
        guard let self, let sdp else { conn.makingOffer = false; return }
        pc.setLocalDescription(sdp) { _ in
            self.signaling.send(type: sdp.type == .offer ? .offer : .answer,
                                sdp: sdp, from: self.myId, to: conn.peerId)
            conn.makingOffer = false
        }
    }
}

func handleRemoteSDP(_ desc: RTCSessionDescription, from peerId: String) {
    let conn = ensurePeer(peerId)
    let pc = conn.pc
    let offerCollision = (desc.type == .offer) &&
        (conn.makingOffer || pc.signalingState != .stable)
    conn.ignoreOffer = !conn.polite && offerCollision
    if conn.ignoreOffer { return }                       // impolite yields

    pc.setRemoteDescription(desc) { [weak self] _ in
        guard let self else { return }
        conn.flushPendingCandidates()                    // Principle 4
        if desc.type == .offer {
            pc.answer(for: self.defaultConstraints) { ans, _ in
                guard let ans else { return }
                pc.setLocalDescription(ans) { _ in
                    self.signaling.send(type: .answer, sdp: ans, from: self.myId, to: peerId)
                }
            }
        }
    }
}
```

### 5.4 ICE candidate buffering

```swift
func handleRemoteCandidate(_ cand: RTCIceCandidate, from peerId: String) {
    let conn = ensurePeer(peerId)
    if conn.pc.remoteDescription == nil {
        conn.pendingCandidates.append(cand)              // buffer
    } else {
        conn.pc.add(cand) { _ in }
    }
}
// flushPendingCandidates(): add all queued, then clear the array.
```

### 5.5 Lifecycle + network recovery (the big one)

```swift
// Foreground
NotificationCenter.default.addObserver(
    self, selector: #selector(recover),
    name: UIApplication.didBecomeActiveNotification, object: nil)

// Network changes
let monitor = NWPathMonitor()
monitor.pathUpdateHandler = { [weak self] path in
    if path.status == .satisfied { self?.recover() }
}
monitor.start(queue: .global())

// Capture interruptions (phone call, Control Center, split view)
NotificationCenter.default.addObserver(
    self, selector: #selector(restartCapture),
    name: .AVCaptureSessionInterruptionEnded, object: captureSession)

@objc func recover() {
    restartCapture()                                  // AVCaptureSession stops in background
    signaling.reconnectIfNeeded()                     // re-open websocket
    signaling.trackPresence(id: myId)                 // re-announce → others get a fresh join
    reconcile(present: signaling.presentParticipantIds())
    for conn in peers.values where conn.pc.connectionState != .connected {
        iceRestart(conn)
    }
}

func iceRestart(_ conn: PeerConn) {
    let cons = RTCMediaConstraints(mandatoryConstraints: ["IceRestart": "true"],
                                   optionalConstraints: nil)
    conn.pc.offer(for: cons) { [weak self] sdp, _ in
        guard let self, let sdp else { return }
        conn.pc.setLocalDescription(sdp) { _ in
            self.signaling.send(type: .offer, sdp: sdp, from: self.myId, to: conn.peerId)
        }
    }
}
```

### 5.6 iOS audio session

Configure once (and after interruptions) so audio routing survives backgrounding
and uses the speaker for a call-like experience:

```swift
let session = RTCAudioSession.sharedInstance()
session.lockForConfiguration()
try? session.setCategory(.playAndRecord, mode: .videoChat,
                         options: [.defaultToSpeaker, .allowBluetooth])
try? session.setActive(true)
session.unlockForConfiguration()
```

---

## 6. iOS checklist (do every item)

- [ ] One stable `participantId` used for presence key, signal `from`/`to`, and the peers dictionary.
- [ ] `ensurePeer(id)` is **idempotent** (reuse existing).
- [ ] `reconcile(present:)` runs on **every** presence event **and** a ~3s timer.
- [ ] Perfect Negotiation: `polite = myId < peerId`, rollback on collision, impolite ignores.
- [ ] Buffer ICE candidates until `remoteDescription` is set, then flush.
- [ ] **Decouple:** join presence/signaling on identity; attach tracks when capture is ready (renegotiates).
- [ ] **Recovery** on `didBecomeActive` **and** `NWPathMonitor.satisfied`: restart capture → reconnect signaling → re-announce presence → reconcile → ICE-restart unhealthy peers.
- [ ] Handle `AVCaptureSessionInterruptionEnded` (and `wasInterrupted`).
- [ ] Configure `RTCAudioSession` for `.playAndRecord` / `.videoChat`.
- [ ] Verify `ontrack`/`didAdd rtpReceiver` actually attaches the remote `RTCVideoTrack` to an `RTCMTLVideoView`.

---

## 7. TURN / Metered notes (connectivity, separate from discovery)

ICE servers (STUN + TURN) are fetched from a server endpoint so credentials
aren't shipped in the client. Order of preference:
1. **Metered** dynamic credentials (`METERED_API_KEY` + `METERED_DOMAIN`) — recommended.
2. Static TURN (`TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`).
3. Public STUN + a public TURN fallback (unreliable).

The iOS app should fetch the **same** ICE-server list (hit the same
`/api/ice-servers` endpoint or replicate it) and pass it into
`RTCConfiguration.iceServers`. Use the same Metered credentials.

**About "0 MB used on Metered":** that's expected and good. TURN is only a
**relay of last resort** — it's used when peers cannot reach each other directly
or via STUN-discovered (srflx) addresses. When a direct/STUN path succeeds
(most home/Wi-Fi networks), **no traffic goes through Metered**, so no bandwidth
is billed. You only consume Metered MB when a peer is behind a symmetric/strict
NAT or a network that blocks P2P (some corporate/cellular/VPN setups), forcing a
`relay` candidate. To confirm whether a relay is in use, inspect
`RTCStatsReport`: find the selected `candidate-pair` and check whether the local
or remote `candidate-type` is `relay`.

So: TURN being configured but showing 0 MB does **not** mean it's unused or
misconfigured — it means your connections are succeeding without needing the
relay. Keep it configured anyway; it's the safety net for restrictive networks.

---

## 8. How to verify the fix on iOS

1. Two devices join the same game → both see both cameras.
2. **Background one device, then foreground it** (do NOT manually rejoin):
   within a few seconds the video should reconnect on its own (you should see
   your recovery routine fire: capture restarts, presence re-announced, peer
   reconnects).
3. Toggle one device Wi-Fi → cellular: connection should ICE-restart and recover.
4. Deny/slow-grant the camera on one device: the other device should still see
   that participant appear (audio/connection) immediately, and their video
   should appear once the camera is granted (renegotiation), proving discovery
   is decoupled from capture.
