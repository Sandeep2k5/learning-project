# learning-project

A browser IDE. Edit JavaScript in Monaco, press Run, and the code executes
on the backend; stdout and stderr come back to a terminal panel.

- **IDE:** https://sandeep2k5.github.io/learning-project/
- **API:** https://learning-api-1mag.onrender.com/api/health

## Layout

| Path | What |
|---|---|
| `web/` | React + Vite + Monaco source. **Edit here.** |
| `docs/` | Build output. GitHub Pages serves this — never edit by hand. |
| `backend/` | Express API: file storage and code execution |
| `k8s/` | Deployment + NodePort Service for minikube |
| `render.yaml` | Render blueprint: Docker web service + free Postgres |

## API

| Route | Does |
|---|---|
| `GET /api/health` | status, node version, which storage is active |
| `GET /api/files` | all files |
| `PUT /api/files/:name` | create or overwrite (name must match `[\w.-]{1,64}`) |
| `DELETE /api/files/:name` | remove one |
| `POST /api/run` | run `{code}`, return `{stdout, stderr, exitCode, timedOut, durationMs}` |

## Security

`POST /api/run` executes arbitrary JavaScript and the URL is public. The
guards are a 5s timeout with SIGKILL, a 64KB output cap, a 100KB code cap,
20 runs per minute per IP, a stripped environment, and a non-root container
user. That is damage limitation, not a sandbox — treat the container as
disposable and keep nothing valuable in it.

## Storage

Postgres when `DATABASE_URL` is set, otherwise an in-memory map (files reset
on restart). `/api/health` reports which is active as `storage`.

## Develop

    cd web && npm install && npm run dev     # http://localhost:5173
    docker compose up --build                # backend on :3000

Point the dev frontend at a local backend with
`http://localhost:5173/?api=http://localhost:3000`.

## Deploy

Frontend: `cd web && npm run build` writes `docs/`; commit and push, and
GitHub Pages republishes. Backend: Render auto-deploys on push to `main`.
