# learning-project

- `backend/` — Node/Express API (`/api/health`, `/api/notes`)
- `frontend/` — source of the static page
- `docs/` — copy of `frontend/index.html`, served by GitHub Pages
- `k8s/` — Deployment + NodePort Service

After editing `frontend/index.html`, run: `cp frontend/index.html docs/index.html`

## Run locally
    docker compose up --build      # http://localhost:3000/api/health

## Deploy the backend to Render (browser, ~3 min)

1. https://dashboard.render.com/blueprints -> New Blueprint Instance
2. Connect this repo. Render reads `render.yaml` (Docker, free plan,
   health check `/api/health`).
3. Apply. The URL will be `https://learning-api.onrender.com` unless the
   name was taken, in which case Render appends a suffix.

If the hostname differs, test it without editing anything:
`https://sandeep2k5.github.io/learning-project/?api=https://<your-url>.onrender.com`

Free instances sleep after inactivity; the first request takes ~50s.
