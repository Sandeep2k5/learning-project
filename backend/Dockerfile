FROM node:20-alpine
WORKDIR /app

# /api/run compiles C++, so the image needs a toolchain. musl-dev supplies
# the libc headers g++ cannot build without. This is the single biggest
# layer in the image — see learn/docker.md Lab 6.
#
# No precompiled header here. One was tried and the measurement that
# justified removing it was confounded — builds were compared across time
# on a shared free instance whose throughput swings roughly 3x, so the
# comparison said nothing about the PCH either way.
#
# A controlled interleaved test on one instance found the real lever is
# which headers the source includes, not precompilation:
#
#   #include <bits/stdc++.h>          19.0s  19.6s  19.8s
#   <iostream> <vector> <unordered_map>  6.2s   5.5s   5.2s
#
# So the seed files include what they use. If a PCH is ever revisited,
# interleave the runs on a single instance.
RUN apk add --no-cache g++ musl-dev

COPY package.json .
RUN npm install --omit=dev

COPY server.js store.js ./
COPY seed ./seed

# /api/run executes user-supplied code; do not hand it root.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
