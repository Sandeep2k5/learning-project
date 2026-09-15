# learning-project

A browser IDE for DSA practice. Edit C++ in Monaco, type a test case into
the Input panel, press Run, and the code compiles and executes on
[Compiler Explorer](https://godbolt.org); stdout, stderr and compiler
diagnostics come back to a terminal panel.

- **IDE:** https://sandeep2k5.github.io/learning-project/

There is no server to deploy or wake. The page is static, files live in
your browser, and running code is one cross-origin call to a public service
that needs no key. A run costs about a second end to end.

## Layout

| Path | What |
|---|---|
| `web/` | React + Vite + Monaco source. **Edit here.** |
| `web/src/seed/` | Starter `.cpp` files, bundled into the page |
| `docs/` | Build output. GitHub Pages serves this — never edit by hand. |
| `backend/` | Express API. The IDE no longer uses it; it is the subject of the Docker labs below. |
| `k8s/` | Deployment + NodePort Service for minikube |
| `render.yaml` | Render blueprint: Docker web service + free Postgres |

## Running code

`web/src/api.js` posts to `godbolt.org/api/compiler/<id>/compile` with
`executorRequest` set, which builds the source and runs the binary rather
than returning assembly. Requests carry the Input panel's contents as
stdin, and the response reports build and run time separately.

The compiler is pinned to `g142` (x86-64 gcc 14.2) with
`-O1 -std=gnu++20 -Wall`. Pinning matters: a compiler that changes
underneath you turns a working solution into a mystery. Try another with
`?compiler=g131`; ids come from `godbolt.org/api/compilers/c++`.

Compiler Explorer enforces its own limits — a program that loops forever
comes back as `timedOut` after roughly 20 seconds. Be a good guest: it is a
free service, and the IDE sends one request per Run, only when you press it.

### Why not a backend

The API in `backend/` used to do this, on Render's free plan. It worked, but
that plan gives 0.1 CPU and builds took 19 seconds against Compiler
Explorer's one. It also sleeps after 15 minutes idle, so the first run after
a break cost another minute waiting for it to wake.

Header choice dominated the build time. Interleaved on one instance, same
program, same input:

| Includes | Build |
|---|---|
| `<bits/stdc++.h>` | 19.0s, 19.6s, 19.8s |
| `<iostream> <vector> <unordered_map>` | 6.2s, 5.5s, 5.2s |

So the seed files include what they use, and the terminal says so when a
slow build came from `<bits/stdc++.h>`. That still holds on Compiler
Explorer, just with smaller numbers.

Measure on the plan you actually deploy to, and interleave the runs — the
free instance's throughput swings about 3x, enough to fake a result either
way. A precompiled header was added and removed here on the strength of a
comparison made across time, which turned out to show nothing.

## Files

Files live in this browser's `localStorage` under the key `files`, seeded
from `web/src/seed/` the first time you open the page.

They are therefore per-browser: work saved at home does not appear on
another machine, and clearing site data loses it. Nothing is uploaded
anywhere except the source you send when you press Run.

## Learn Docker

The `backend/` service is still here as something real to containerise.
Open this repo in a GitHub Codespace (**Code → Codespaces → Create**). The
devcontainer gives it its own Docker daemon plus kubectl and minikube, so
everything below works in the browser.

Then work through [`learn/docker.md`](learn/docker.md) — seven labs on this
codebase: images vs containers, layer caching, inspecting a running
container, container networking, volumes, image size, and Kubernetes.

That API compiles C++ too, so its image carries a toolchain: `apk add g++
musl-dev` is by far the largest layer, which makes Lab 6 on image size less
hypothetical than it used to be.

## Develop

    cd web && npm install && npm run dev     # http://localhost:5173

That is the whole IDE. For the Docker labs:

    cd backend && npm install && npm start   # api on :3000, needs g++ on PATH
    docker compose up -d --build             # api on :3000 + Postgres

## Deploy

`cd web && npm run build` writes `docs/`; commit and push, and GitHub Pages
republishes. There is nothing else to deploy.
