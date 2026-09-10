# learning-project

- `backend/` — Node/Express API (`/api/health`, `/api/notes`)
- `frontend/` — source of the static page
- `docs/` — copy of `frontend/index.html`, served by GitHub Pages
- `k8s/` — Deployment + NodePort Service

After editing `frontend/index.html`, run: `cp frontend/index.html docs/index.html`

## Run locally
    docker compose up --build      # http://localhost:3000/api/health
