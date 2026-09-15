FROM node:20-alpine
WORKDIR /app

# /api/run compiles C++, so the image needs a toolchain. musl-dev supplies
# the libc headers g++ cannot build without. This is the single biggest
# layer in the image — see learn/docker.md Lab 6.
RUN apk add --no-cache g++ musl-dev

# Precompile <bits/stdc++.h>. Every DSA solution includes it, and parsing it
# from scratch costs seconds on Render's 0.1-CPU free instance. GCC picks up
# <header>.gch automatically when the flags match CXX_FLAGS in server.js,
# and silently falls back to the real header when they do not.
# Best-effort: a missing header costs speed, not correctness, so it must
# never fail the deploy.
RUN STDCPP=$(find /usr/include -path '*bits*' -name 'stdc++.h' | head -1); if [ -n "$STDCPP" ]; then g++ -std=gnu++20 -O1 -Wall -x c++-header "$STDCPP" -o "$STDCPP.gch" && echo "PCH built: $STDCPP.gch"; else echo 'no bits/stdc++.h found, skipping PCH'; fi

COPY package.json .
RUN npm install --omit=dev

COPY server.js store.js ./
COPY seed ./seed

# /api/run executes user-supplied code; do not hand it root.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
