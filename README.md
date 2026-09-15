# learning-project

A browser IDE for DSA practice. Edit C++ in Monaco, type a test case into
the Input panel, press Run, and the backend compiles with g++ and executes
the binary; stdout, stderr and compiler diagnostics come back to a terminal
panel.

- **IDE:** https://sandeep2k5.github.io/learning-project/
- **API:** https://learning-api-1mag.onrender.com/api/health

## Layout

| Path | What |
|---|---|
| `web/` | React + Vite + Monaco source. **Edit here.** |
| `docs/` | Build output. GitHub Pages serves this — never edit by hand. |
| `backend/` | Express API: file storage and code execution |
| `backend/seed/` | Starter `.cpp` files loaded on first run |
| `k8s/` | Deployment + NodePort Service for minikube |
| `render.yaml` | Render blueprint: Docker web service + free Postgres |

## API

| Route | Does |
|---|---|
| `GET /api/health` | status, compiler version, which storage is active |
| `GET /api/files` | all files |
| `PUT /api/files/:name` | create or overwrite (name must match `[\w.-]{1,64}`) |
| `DELETE /api/files/:name` | remove one |
| `POST /api/run` | compile and run `{code, stdin}`, return `{stdout, stderr, exitCode, timedOut, compileOk, diagnostics, compileMs, durationMs}` |

## Security

`POST /api/run` compiles and executes arbitrary C++ and the URL is public.
The guards are a 30s compile timeout and a 5s run timeout, both with
SIGKILL, a 64KB output cap, a 100KB code cap, a 64KB stdin cap, 20 runs per
minute per IP, a stripped environment, and a non-root container user. That
is damage limitation, not a sandbox — treat the container as disposable and
keep nothing valuable in it.

The API runs on Render's free plan, which sleeps after 15 minutes idle and
takes roughly a minute to wake. The IDE retries the health check four times
before reporting the backend down, so a cold open looks slow, not broken.

Compiling is slower than interpreting, and the free instance is slow: a
build including `<bits/stdc++.h>` measured between 7 and 20 seconds there,
against under 200ms to actually run. The terminal reports build and run time
separately so you can see which phase cost what.

Precompiling that header was tried and reverted — it made builds slower on
this plan, not faster. The Dockerfile records the numbers.

## Storage

Postgres when `DATABASE_URL` is set, otherwise an in-memory map (files reset
on restart). `/api/health` reports which is active as `storage`.

Seeding only happens when the table is empty, so a database that already
holds the old JavaScript files keeps them. Delete them in the Explorer to
get the C++ starters on the next empty start.

## Learn Docker

Open this repo in a GitHub Codespace (**Code → Codespaces → Create**). The
devcontainer gives it its own Docker daemon plus kubectl and minikube, so
everything below works in the browser.

Then work through [`learn/docker.md`](learn/docker.md) — seven labs on this
codebase: images vs containers, layer caching, inspecting a running
container, container networking, volumes, image size, and Kubernetes.

## Develop

    cd web && npm install && npm run dev     # http://localhost:5173
    cd backend && npm install && npm start   # api on :3000
    docker compose up -d --build             # api on :3000 + Postgres

Running the backend directly needs g++ on `PATH` (MinGW-w64 on Windows,
`build-essential` on Debian/Ubuntu). The container brings its own.

Compose runs the backend against a real Postgres, so `/api/health` reports
`"storage":"postgres"` and saved files survive restarts.

Point the dev frontend at a local backend with
`http://localhost:5173/?api=http://localhost:3000`.

## Deploy

Frontend: `cd web && npm run build` writes `docs/`; commit and push, and
GitHub Pages republishes. Backend: Render auto-deploys on push to `main`.
