# learning-project

A browser IDE for DSA practice. Edit C++ in Monaco, type a test case into
the Input panel, press Run. Code compiles and executes on
[Compiler Explorer](https://godbolt.org) — about a second, round trip.

**IDE:** https://sandeep2k5.github.io/learning-project/

Nothing to deploy or wake: a static page plus one cross-origin call to a
service that needs no key.

## Layout

| Path | What |
|---|---|
| `web/` | React + Vite + Monaco. **Edit here.** |
| `web/src/seed/` | Starter `.cpp` files |
| `docs/` | Build output. Pages serves this — never edit by hand. |
| `backend/`, `k8s/`, `render.yaml` | Unused by the IDE; the subject of the Docker labs |

## Notes

Compiler pinned to `g142` (gcc 14.2), `-O1 -std=gnu++20 -Wall`. Override
with `?compiler=g131`.

Files live in this browser's `localStorage`, so they do not follow you to
another machine and clearing site data loses them.

`<bits/stdc++.h>` roughly triples build time. The seeds include what they
use, and the terminal says so when a slow build came from it.

## Develop

    cd web && npm install && npm run dev     # http://localhost:5173

`npm run build` writes `docs/`; commit and push and Pages republishes.

Docker and Kubernetes labs run against `backend/`:
[`learn/docker.md`](learn/docker.md).
