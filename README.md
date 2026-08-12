# Gappen

A random 1-on-1 video chat app — think Omegle/Chatroulette. Two strangers get matched, get a live
peer-to-peer video/audio call plus a text chat panel, and can skip to a new stranger anytime.

Built with Express + Socket.IO for signaling and matchmaking, WebRTC for the actual peer-to-peer
media, Redis for matchmaking/room state, and MongoDB for session tracking and abuse control.

## How it works

1. A visitor lands on the home page and gets a randomly generated display name.
2. Clicking in emits a `join` event over Socket.IO and drops the user into a Redis waiting queue.
3. Once two users are queued, the server matches them into a room and brokers a WebRTC handshake
   (offer → answer → ICE candidates) between their browsers.
4. Once the handshake completes, video/audio flows **directly between the two browsers** — the
   server never touches the media stream, only the initial connection setup.
5. Either side can hit "skip" to leave the call and get re-queued for a new match.

## Tech stack

| Component | Role |
|---|---|
| Express + EJS | HTTP routes, server-rendered pages (landing page, call page) |
| Socket.IO | Real-time matchmaking, WebRTC signaling relay, chat relay |
| WebRTC | Peer-to-peer audio/video between matched users |
| Redis | Matchmaking queues, active room state (ephemeral) |
| MongoDB (Mongoose) | Session tracking, abuse/blacklist state (durable) |
| Docker Compose | Local Redis + MongoDB for development |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (tested on v22)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start Redis and MongoDB

A `docker-compose.yml` is included, spinning up Redis on `6379` and MongoDB on `27017`.

```bash
docker-compose up -d
```

> **Note on Docker Compose commands:** depending on how Docker is installed on your system, the
> command is either `docker-compose up -d` (hyphenated, the standalone/legacy tool) or
> `docker compose up -d` (space, the newer plugin bundled with recent Docker installs). If one
> gives you `unknown shorthand flag` or `command not found`, try the other. See
> [Troubleshooting](#troubleshooting) below.

Confirm both containers are running:

```bash
docker ps
```

You should see two containers with status `Up` — one for `redis`, one for `mongo`.

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
MONGO_URI=mongodb://rootuser:rootpass@localhost:27017/?authSource=admin

# Needed for WebRTC to work reliably across different networks/NATs.
# Not required for same-machine testing (STUN alone is enough over localhost).
TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

`PORT`, `REDIS_URL`, and `MONGO_URI` all have working fallback defaults in `index.js` that match
`docker-compose.yml`, so you don't strictly need to set those three if you're using the provided
compose file as-is. Only `TURN_*` needs a real value, and only if you're testing across two
different networks (e.g. one peer behind a restrictive NAT/firewall).

Free options for TURN credentials during development: a [Twilio](https://www.twilio.com/) trial
account, or self-hosting [coturn](https://github.com/coturn/coturn) via Docker.

### 4. Run the server

```bash
npm start
```

You should see `Server ready on port 3000` with no error output after it.

### 5. Try it out

- Open `http://localhost:3000` in your browser.
- Open a **second tab in incognito/private mode** (or a different browser entirely) and go to the
  same URL. This matters — the app identifies visitors by a cookie-based session ID, so two tabs
  in the same normal browser session share one identity and won't match each other as two
  separate users.
- Click into a call from both tabs. With only two people in the queue, they should match
  immediately.
- Your browser will prompt for camera/microphone permission on the call page — allow it, or the
  peer connection won't have anything to send.

## Troubleshooting

**`unknown shorthand flag: 'd' in -d` when running `docker compose up -d`**
Your Docker install doesn't have the Compose plugin — use the hyphenated form instead:
```bash
docker-compose up -d
```
If that command isn't found either, install one of:
```bash
sudo apt install docker-compose-plugin   # modern plugin -> use `docker compose` (space)
# or
sudo apt install docker-compose          # legacy standalone -> use `docker-compose` (hyphen)
```

**`PermissionError: [Errno 13] Permission denied` / `Error while fetching server API version`**
Your user isn't in the `docker` group, so it can't reach the Docker daemon's socket.
```bash
sudo usermod -aG docker $USER
```
Then log out and back in (or run `newgrp docker` to apply it to your current shell without
logging out). Verify with `docker ps` — it should run without `sudo` and without errors.

**`Redis error: Error: connect ECONNREFUSED 127.0.0.1:6379` when running `npm start`**
Redis isn't actually running yet. Run `docker-compose up -d` (or `docker compose up -d`) first,
confirm with `docker ps` that a Redis container shows status `Up`, then start the app again.

**Two tabs won't match each other**
Make sure they're genuinely separate sessions — one normal window and one incognito/private
window (or two different browsers). Two tabs in the same browser session share a cookie and
count as one user.

**Video/audio never connects, but no errors appear**
Almost always a missing or invalid TURN configuration when testing across two different networks.
Same-machine testing (two tabs on `localhost`) doesn't need TURN — STUN alone is enough for a
direct connection.

## Project structure

```
Gappen-main/
├── index.js                    # App entry point — Express/Socket.IO bootstrap, Redis + Mongo connections
├── docker-compose.yml          # Local dev stack: redis + mongodb
├── middleware/
│   └── validateRequest.js      # Session cookie issuance + blacklist gate
├── models/
│   ├── session.js              # Mongoose schema: sessionId, fingerprint, visit counter, blacklist flag
│   └── blocked.js              # Mongoose schema: IP-based blocking
├── routes/
│   ├── home.js                 # GET / (random display name), POST /fingerPrint
│   ├── call.js                 # GET /room (renders the call page)
│   ├── api.js                  # GET /api/get-servers (STUN/TURN ICE config)
│   └── assets/names.txt        # Word list for random display names
├── socketHandlers/
│   └── handlers.js             # Matchmaking queues, room lifecycle, signaling relay, cleanup
├── templates/
│   ├── index.ejs               # Landing page
│   └── call.ejs                # Call page — video elements, chat panel, controls
└── public/
    ├── css/                    # Stylesheets
    ├── img/                    # Logo, favicon
    └── js/
        ├── main.js             # Client WebRTC + Socket.IO logic, chat UI
        └── fingerprint.js      # Device fingerprinting for abuse detection
```

## Known limitations

- No automated tests (`npm test` is currently a placeholder that always fails).
- No Socket.IO Redis adapter configured, so the app currently only scales to a single server
  instance — room broadcasts won't reach users connected to a different instance.
- Chat messages are rendered without HTML escaping — treat this as a development-only feature
  until that's fixed, don't expose chat to untrusted users in a public deployment as-is.

## License

ISC (see `package.json`).
