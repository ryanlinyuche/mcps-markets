# MCPS Markets Backend

Improved TypeScript rewrite of [SynergyAltBackend](https://github.com/Jshap06/SynergyAltBackend) — a StudentVUE/Synergy proxy server.

## What it does

- Proxies SOAP requests to StudentVUE districts (replacing the Railway proxy)
- AES-encrypts/decrypts passwords so they are never sent in plaintext
- Authenticates students and manages session cookies
- Fetches grades, assignments, student info, documents, and photos
- Serializes concurrent assignment requests per session to prevent race conditions
- Rate limits and IP banning for abuse prevention

## Improvements over original

| Original | This version |
|----------|-------------|
| Plain JavaScript | TypeScript with strict types |
| Hardcoded ViewState (bug) | Properly cached + auto-refreshed ViewState |
| URL concat bug in `/getStudentInfo` | Fixed |
| Debug credential logging | Removed |
| No input validation | Zod schemas on every endpoint |
| No API key auth | Optional Bearer token auth |
| No structured logging | Winston JSON logs |
| No graceful shutdown | SIGTERM/SIGINT handling |
| No Docker/k8s support | Multi-stage Dockerfile + Helm chart |
| Direct port exposure | Cloudflare Tunnel only |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth required) |
| GET | `/userCount` | Anonymous daily user count |
| POST | `/encryptPassword` | AES-encrypt a password |
| POST | `/fulfillAxios` | Forward SOAP XML to Synergy (with optional decrypt) |
| POST | `/refresh` | Authenticate and get session cookies |
| POST | `/getHomePageGrades` | Fetch grade book HTML |
| POST | `/getAssignments` | Fetch assignments for a class |
| POST | `/getStudentInfo` | Fetch student info HTML |
| POST | `/getDocuments` | Fetch documents list HTML |
| POST | `/getDocument` | Fetch a specific PDF document |
| POST | `/getStudentPhoto` | Fetch student photo binary |

## Local development

```bash
cp .env.example .env
# Edit .env with your ENCRYPTION_KEY
npm install
npm run dev
```

## Docker (standalone)

```bash
# No ports exposed externally — traffic goes through Cloudflare Tunnel only
cp .env.example .env
# Edit .env with ENCRYPTION_KEY and CLOUDFLARE_TUNNEL_TOKEN
docker compose up -d
```

## Kubernetes with Helm

```bash
helm install mcps-backend ./helm/mcps-backend \
  --set secrets.ENCRYPTION_KEY="your-key" \
  --set cloudflared.tunnelToken="your-cloudflare-tunnel-token" \
  --set image.repository="ghcr.io/your-org/mcps-backend" \
  --set image.tag="1.0.0"
```

## Cloudflare Tunnel setup

1. In the Cloudflare Zero Trust dashboard, create a new tunnel
2. Choose "Docker" as the connector type — copy the `TUNNEL_TOKEN`
3. Add a Public Hostname pointing to `http://mcps-backend:3000` (Docker) or `http://mcps-backend-service:3000` (k8s)
4. Set `CLOUDFLARE_TUNNEL_TOKEN` in your `.env` or Helm values
5. Traffic flows: Client → Cloudflare Edge → cloudflared → backend (no inbound ports opened)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | AES key for password encryption |
| `CLOUDFLARE_TUNNEL_TOKEN` | Yes | Cloudflare tunnel token |
| `API_KEY` | No | Bearer token for API auth (leave blank to disable) |
| `BAN_LIST` | No | Comma-separated IPs to block |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `production` or `development` |
| `RATE_LIMIT_ENABLED` | No | Enable rate limiting (default: true) |
