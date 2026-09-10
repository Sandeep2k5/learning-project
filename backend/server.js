const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const store = require('./store');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// --- limits -------------------------------------------------------------
// /api/run executes user-supplied code. These caps are the only thing
// standing between a public endpoint and an unbounded process.
const RUN_TIMEOUT_MS = 5000;
const RUN_MAX_OUTPUT = 64 * 1024;
const RUN_PER_MIN = 20;

const buckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const window = 60_000;
  const hits = (buckets.get(ip) || []).filter((t) => now - t < window);
  hits.push(now);
  buckets.set(ip, hits);
  if (buckets.size > 5000) buckets.clear(); // crude guard against unbounded growth
  return hits.length > RUN_PER_MIN;
}

// --- routes -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    node: process.version,
    storage: store.kind
  });
});

app.get('/api/files', async (req, res, next) => {
  try {
    res.json(await store.list());
  } catch (err) {
    next(err);
  }
});

app.put('/api/files/:name', async (req, res, next) => {
  const name = req.params.name;
  if (!/^[\w.-]{1,64}$/.test(name)) {
    return res.status(400).json({ error: 'invalid filename' });
  }
  try {
    const file = await store.save(name, String(req.body.content ?? ''));
    res.json(file);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/files/:name', async (req, res, next) => {
  try {
    await store.remove(req.params.name);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post('/api/run', async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (rateLimited(String(ip).split(',')[0].trim())) {
    return res.status(429).json({ error: 'too many runs, wait a minute' });
  }

  const code = String(req.body.code ?? '');
  if (!code.trim()) return res.status(400).json({ error: 'no code' });
  if (code.length > 100_000) return res.status(413).json({ error: 'code too large' });

  const dir = path.join(os.tmpdir(), 'run-' + randomUUID());
  const file = path.join(dir, 'main.js');
  const started = Date.now();

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, code, 'utf8');

    const result = await new Promise((resolve) => {
      execFile(
        process.execPath,
        [file],
        {
          cwd: dir,
          timeout: RUN_TIMEOUT_MS,
          maxBuffer: RUN_MAX_OUTPUT,
          killSignal: 'SIGKILL',
          // Deliberately minimal: user code should not see our env.
          env: { PATH: '/usr/local/bin:/usr/bin:/bin', NODE_ENV: 'sandbox' }
        },
        (err, stdout, stderr) => {
          const timedOut = Boolean(err && err.killed);
          resolve({
            stdout: String(stdout || ''),
            stderr: String(stderr || (err && !timedOut ? err.message : '')),
            exitCode: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
            timedOut
          });
        }
      );
    });

    res.json({ ...result, durationMs: Date.now() - started });
  } catch (err) {
    next(err);
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;

store.init().then(() => {
  app.listen(PORT, () => console.log(`API running on port ${PORT} (${store.kind})`));
});
