FROM node:20-alpine
WORKDIR /app

# /api/run compiles C++, so the image needs a toolchain. musl-dev supplies
# the libc headers g++ cannot build without. This is the single biggest
# layer in the image — see learn/docker.md Lab 6.
#
# No precompiled header here on purpose. Precompiling <bits/stdc++.h> and
# forcing it in with -include was measured on the free instance and made
# builds slower, not faster: 19.6s then 8.1s against 7.3s without it. The
# .gch is roughly a hundred megabytes and reading it back on a 0.1-CPU,
# 512MB instance costs more than reparsing the header. Do not reintroduce
# it without measuring on the target plan.
RUN apk add --no-cache g++ musl-dev

COPY package.json .
RUN npm install --omit=dev

COPY server.js store.js ./
COPY seed ./seed

# /api/run executes user-supplied code; do not hand it root.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
