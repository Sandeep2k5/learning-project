# Docker, using this project

Seven labs on the code in this repo — no toy `hello-world` containers.
Every command here was run and verified before it was written down.

Open a terminal in the codespace and check you have a daemon:

    docker version

If that prints a **Server** section, you're ready. Start at Lab 1.

**Core:** 1 build · 2 caching · 3 look inside · 4 two containers
**Then:** 5 volumes · 6 size · 7 kubernetes

---

## Lab 1 — Image vs container

The single idea people get wrong: an **image** is a frozen filesystem, a
**container** is a running process using it. One image, many containers.

    docker build -t learning-backend:latest ./backend
    docker run -d --name api -p 3000:3000 learning-backend:latest
    curl http://localhost:3000/api/health

Now run a *second* container from the *same* image on a different port:

    docker run -d --name api2 -p 3001:3000 learning-backend:latest
    curl http://localhost:3001/api/health

**Notice:** `-p 3001:3000` is `host:container`. Inside, both containers
think they're on 3000. They don't collide because each has its own network
namespace.

    docker ps                 # two containers
    docker images             # one image
    docker rm -f api api2

> **Try:** run a third with no `-p` at all. Can you curl it? Why not?

---

## Lab 2 — Layer caching

Look at `backend/Dockerfile`. This ordering is deliberate:

    COPY package.json .
    RUN npm install --omit=dev
    COPY server.js store.js ./

Each instruction makes a layer. Docker reuses a layer if that instruction
*and everything before it* is unchanged.

Time a rebuild after changing only source:

    echo "// touch" >> backend/server.js
    time docker build -t learning-backend:latest ./backend

**Notice:** `npm install` says `CACHED`. Only the last `COPY` re-ran.

Now break it — change the dependency file instead:

    echo "" >> backend/package.json
    time docker build -t learning-backend:latest ./backend

**Notice:** `npm install` re-runs, and the build takes several times longer.

> **Try:** swap the order so `COPY . .` comes before `RUN npm install`.
> Rebuild twice. Every source edit now costs a full reinstall. Put it back.

    git checkout backend/

---

## Lab 3 — Look inside a running container

    docker run -d --name api -p 3000:3000 learning-backend:latest

Five commands that answer "what is it actually doing":

    docker logs -f api                    # stdout (Ctrl+C to stop following)
    docker exec -it api sh                # shell inside it
    docker stats --no-stream api          # live CPU / memory
    docker inspect api | head -40         # full config as JSON
    docker diff api                       # files changed since the image
                                          # (empty here — this app writes nothing)

Inside that shell, try:

    ls /app          # package.json, server.js, store.js, node_modules — nothing else
    whoami           # node, not root — set by `USER node` in the Dockerfile
    ps aux           # PID 1 is your node process
    exit

**Notice:** the container has no editor, no git, no curl. It's the
application and nothing else. That's the point.

    docker rm -f api

---

## Lab 4 — Two containers talking

`docker-compose.yml` defines `api` and `db`. Bring both up:

    docker compose up -d --build
    curl http://localhost:3000/api/health

**Notice:** `"storage":"postgres"` instead of `"memory"`. The app found a
database.

How did it find it? Look at the compose file:

    DATABASE_URL: postgres://learning:learning@db:5432/learning

The hostname is `db` — the *service name*. Compose puts both containers on
one network and registers each service name as DNS. Prove it:

    docker compose exec api sh -c "getent hosts db"
    docker compose exec db psql -U learning -c '\dt'

**Notice:** port 5432 is never published to your machine. Only `api` can
reach the database. That's a network boundary, not a firewall rule.

    docker compose logs -f db     # watch it accept connections
    docker compose ps             # health status of both

> **Try:** `docker compose stop db`, then curl `/api/files`. Read the error.
> Then `docker compose start db` and watch it recover.

---

## Lab 5 — Data that survives

Containers are disposable; their writable layer dies with them. Named
volumes are how data outlives them.

Save a file through the API, then destroy the containers:

    curl -X PUT http://localhost:3000/api/files/notes.js \
      -H 'Content-Type: application/json' \
      -d '{"content":"console.log(1)"}'

    docker compose down          # containers gone
    docker compose up -d         # fresh containers
    curl http://localhost:3000/api/files

**Notice:** `notes.js` is still there. The `pgdata:` volume was never
deleted.

    docker volume ls
    docker volume inspect doc_pgdata

Now delete it for real:

    docker compose down -v       # -v also removes volumes
    docker compose up -d
    curl http://localhost:3000/api/files

**Notice:** back to the two seed files. `-v` is the difference between
"restart" and "wipe". Learn it here, not on something that matters.

---

## Lab 6 — Making the image smaller

    docker images learning-backend

Roughly 213MB. Where does it go?

    docker history learning-backend:latest

**Notice:** `npm install` adds ~17MB, your source adds ~16KB, and the rest
is the `node:20-alpine` base image. Your code is a rounding error.

Two levers:

1. **`.dockerignore`** — see `backend/.dockerignore`. Without it, a local
   `node_modules` gets copied into the build context and then overwritten.
   Wasteful and slow.
2. **The base image.** Try `FROM node:20` instead of `node:20-alpine`,
   rebuild, and compare `docker images`. Alpine is ~10x smaller.

> **Try:** a multi-stage build. Install deps in one stage, copy only
> `node_modules` and source into a fresh `node:20-alpine`. Does it help
> here? (Honest answer: barely — there's no build step to throw away. It
> matters hugely for TypeScript, Go, or anything compiled.)

---

## Lab 7 — Same image, on Kubernetes

`k8s/` runs the exact image you just built.

    minikube start --driver=docker
    minikube image load learning-backend:latest
    kubectl apply -f k8s/
    kubectl get pods -w              # Ctrl+C when both are Running

**Notice:** `k8s/deployment.yaml` says `imagePullPolicy: Never`. Without
it, Kubernetes ignores your local image and tries to pull from a registry.

    kubectl logs -l app=learning-api --tail=20
    kubectl describe pod -l app=learning-api | tail -20
    minikube service learning-api-service

> **Try:** `kubectl scale deployment learning-api --replicas=5`, then
> `kubectl get pods`. Then delete one pod and watch it come back.

    kubectl delete -f k8s/
    minikube stop

---

## The commands worth memorising

| Command | Use |
|---|---|
| `docker ps -a` | what exists, including stopped |
| `docker logs -f <name>` | why is it broken |
| `docker exec -it <name> sh` | get inside and look |
| `docker compose up -d --build` | rebuild and restart everything |
| `docker system df` / `prune` | what's eating disk, reclaim it |

## When something breaks

- **`Cannot connect to the Docker daemon`** — daemon isn't running.
- **`port is already allocated`** — `docker ps`, find the container on that
  port, `docker rm -f` it.
- **Container exits instantly** — `docker logs <name>`. The process crashed;
  the container just reports it.
- **`COPY failed: no source files`** — path is relative to the build
  *context* (the directory argument), not the Dockerfile.
- **Changes not appearing** — you rebuilt the image but are still running
  the old container. `docker compose up -d --build`.
