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
// /api/run compiles and executes user-supplied code. These caps are the
// only thing standing between a public endpoint and an unbounded process.
const COMPILE_TIMEOUT_MS = 20_000;
const RUN_TIMEOUT_MS = 5000;
const RUN_MAX_OUTPUT = 64 * 1024;
const RUN_PER_MIN = 20;
const MAX_STDIN = 64 * 1024;

// Deliberately minimal: user code should not see our env. Windows needs
// the real PATH (MinGW lives outside any fixed prefix), so local dev on
// Windows keeps PATH and drops everything else.
const IS_WIN = process.platform === 'win32';
const SANDBOX_ENV = {
  PATH: IS_WIN ? process.env.PATH : '/usr/local/bin:/usr/bin:/bin',
  LANG: 'C'
};

const CXX = process.env.CXX || 'g++';
// -O1 not -O2: these must match the flags the PCH in the Dockerfile was
// built with, or GCC discards it and reparses the header every run.
const CXX_FLAGS = ['-std=gnu++20', '-O1', '-Wall', '-pipe'];

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

// Reported by /api/health so the IDE can show which compiler is behind Run.
let compilerVersion = 'unknown';
function probeCompiler() {
  return new Promise((resolve) => {
    execFile(CXX, ['--version'], { timeout: 5000 }, (err, stdout) => {
      compilerVersion = err ? 'missing' : String(stdout).split('\n')[0].trim();
      resolve();
    });
  });
}

// --- routes -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    language: 'c++',
    compiler: compilerVersion,
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

// g++ prints the absolute temp path in every diagnostic. Nobody wants to
// read `/tmp/run-<uuid>/main.cpp:12` — rewrite it back to `main.cpp:12`.
function scrub(text, dir) {
  if (!text) return '';
  return text.split(dir + path.sep).join('').split(dir + '/').join('');
}

// Compile main.cpp, then run the binary. Two separate phases with separate
// timeouts: a slow compile should not eat the program's own 5s budget.
function compile(dir, source, binary) {
  return new Promise((resolve) => {
    execFile(
      CXX,
      [...CXX_FLAGS, source, '-o', binary],
      {
        cwd: dir,
        timeout: COMPILE_TIMEOUT_MS,
        maxBuffer: RUN_MAX_OUTPUT,
        killSignal: 'SIGKILL',
        env: SANDBOX_ENV
      },
      (err, stdout, stderr) => {
        const timedOut = Boolean(err && err.killed);
        resolve({
          ok: !err,
          timedOut,
          // g++ writes both warnings and errors to stderr.
          diagnostics: String(stderr || stdout || (err && !timedOut ? err.message : ''))
        });
      }
    );
  });
}

function execute(dir, binary, input) {
  return new Promise((resolve) => {
    const child = execFile(
      binary,
      [],
      {
        cwd: dir,
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: RUN_MAX_OUTPUT,
        killSignal: 'SIGKILL',
        env: SANDBOX_ENV
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

    // A program that never reads stdin closes the pipe early; that is not
    // an error worth surfacing.
    child.stdin.on('error', () => {});
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

app.post('/api/run', async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (rateLimited(String(ip).split(',')[0].trim())) {
    return res.status(429).json({ error: 'too many runs, wait a minute' });
  }

  const code = String(req.body.code ?? '');
  if (!code.trim()) return res.status(400).json({ error: 'no code' });
  if (code.length > 100_000) return res.status(413).json({ error: 'code too large' });

  const input = String(req.body.stdin ?? '');
  if (input.length > MAX_STDIN) return res.status(413).json({ error: 'stdin too large' });

  const dir = path.join(os.tmpdir(), 'run-' + randomUUID());
  const source = path.join(dir, 'main.cpp');
  const binary = path.join(dir, IS_WIN ? 'main.exe' : 'main');
  const started = Date.now();

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(source, code, 'utf8');

    const built = await compile(dir, source, binary);
    const compileMs = Date.now() - started;

    if (!built.ok) {
      return res.json({
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        compileOk: false,
        compileTimedOut: built.timedOut,
        diagnostics: scrub(built.diagnostics, dir),
        compileMs,
        durationMs: 0
      });
    }

    const ranAt = Date.now();
    const result = await execute(dir, binary, input);

    res.json({
      ...result,
      stderr: scrub(result.stderr, dir),
      compileOk: true,
      compileTimedOut: false,
      // Warnings from a successful build are still worth showing.
      diagnostics: scrub(built.diagnostics, dir),
      compileMs,
      durationMs: Date.now() - ranAt
    });
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

Promise.all([store.init(), probeCompiler()]).then(() => {
  app.listen(PORT, () =>
    console.log(`API running on port ${PORT} (${store.kind}, ${compilerVersion})`)
  );
});
