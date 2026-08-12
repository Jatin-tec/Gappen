# Setup Guide — Gappen

Quick step-by-step guide to get Gappen running locally.

## 1. Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

## 2. Install dependencies

```bash
npm install
```

## 3. Start Redis and MongoDB

```bash
docker-compose up -d
```

> If this fails with `unknown shorthand flag: 'd' in -d`, your Docker install uses the newer
> plugin — try `docker compose up -d` (space instead of hyphen) instead. If neither command is
> found, install one:
> ```bash
> sudo apt install docker-compose-plugin   # then use: docker compose up -d
> # or
> sudo apt install docker-compose          # then use: docker-compose up -d
> ```
>
> If you get a `Permission denied` error talking to Docker, your user isn't in the `docker`
> group:
> ```bash
> sudo usermod -aG docker $USER
> newgrp docker
> ```

Confirm both containers are running:

```bash
docker ps
```

You should see two containers with status `Up` — one `redis`, one `mongo`.

## 4. Create a `.env` file

In the project root:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
MONGO_URI=mongodb://rootuser:rootpass@localhost:27017/?authSource=admin

TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

`PORT`, `REDIS_URL`, and `MONGO_URI` already have matching defaults in the code, so this file is
only strictly required for the `TURN_*` values — and even those aren't needed for same-machine
testing (STUN alone works over `localhost`).

## 5. Run the app

```bash
npm start
```

Expect to see:
```
Server ready on port 3000
```
with no `Redis error` lines after it. If you do see `ECONNREFUSED` errors, go back to step 3 —
Redis isn't actually running yet.

## 6. Test it

1. Open `http://localhost:3000` in your normal browser window.
2. Open a **second tab in incognito/private mode** (or a different browser) at the same URL —
   two tabs in the same normal session share a cookie and won't match as separate users.
3. Click in from both tabs, allow camera/mic access when prompted.
4. The two tabs should match each other and connect via video within a couple seconds.

## Troubleshooting reference

| Symptom | Fix |
|---|---|
| `unknown shorthand flag: 'd' in -d` | Use `docker-compose up -d` (hyphen) instead of `docker compose up -d` (space), or vice versa |
| `command not found: docker-compose` | `sudo apt install docker-compose-plugin` (or `docker-compose`) |
| `Permission denied` connecting to Docker | `sudo usermod -aG docker $USER` then `newgrp docker` |
| `Redis error: ECONNREFUSED 127.0.0.1:6379` | Redis container isn't running — `docker-compose up -d`, then check `docker ps` |
| Two tabs won't match | Use a genuinely separate session (incognito/different browser), not two tabs in one session |
| No video, no errors | Missing TURN config — only matters across different networks, not on `localhost` |
