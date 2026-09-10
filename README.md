# learning-project

- `backend/` — Node/Express API (`/api/health`, `/api/notes`)
- `frontend/` — source of the static page
- `docs/` — copy of `frontend/index.html`, served by GitHub Pages
- `k8s/` — Deployment + NodePort Service

After editing `frontend/index.html`, run: `cp frontend/index.html docs/index.html`

## Run locally
    docker compose up --build      # http://localhost:3000/api/health

## Backend

Deployed on Render from `render.yaml` (Docker, free plan, health check
`/api/health`), auto-deploying on every push to `main`:

    https://learning-api-1mag.onrender.com/api/health

Free instances sleep after inactivity; the first request takes ~50s.

To point the page at a different backend without editing anything:

    https://sandeep2k5.github.io/learning-project/?api=https://other-host

## Frontend

https://sandeep2k5.github.io/learning-project/ (GitHub Pages, `main` `/docs`).
