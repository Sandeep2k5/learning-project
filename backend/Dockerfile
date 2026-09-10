FROM node:20-alpine
WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY server.js store.js ./

# /api/run executes user-supplied code; do not hand it root.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
