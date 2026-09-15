// The IDE has no backend. Files live in this browser and code runs on
// Compiler Explorer, a public service that needs no key and allows
// cross-origin calls. Nothing to deploy, nothing to wake up.
import mainCpp from './seed/main.cpp?raw';
import twoSumCpp from './seed/two_sum.cpp?raw';
import scratchCpp from './seed/scratch.cpp?raw';

const CE_URL = 'https://godbolt.org/api/compiler';

// Pinned rather than "latest": a compiler that changes under you turns a
// working solution into a mystery. Override with ?compiler=g131 to try
// another; the ids come from godbolt.org/api/compilers/c++.
export const COMPILER =
  new URLSearchParams(location.search).get('compiler') || 'g142';

export const COMPILER_NAME = 'x86-64 gcc 14.2';
export const CXX_ARGS = '-O1 -std=gnu++20 -Wall';

const STORE_KEY = 'files';

const SEED = [
  { name: 'main.cpp', content: mainCpp },
  { name: 'scratch.cpp', content: scratchCpp },
  { name: 'two_sum.cpp', content: twoSumCpp }
];

// --- files: localStorage -------------------------------------------------
function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* private mode, or someone hand-edited the key */
  }
  return null;
}

function writeStore(files) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(files));
  } catch (err) {
    // Quota is the realistic failure. Say so rather than losing the edit
    // silently, since this store is the only copy.
    throw new Error('could not save: ' + err.message);
  }
}

function stamp(name, content) {
  return { name, content, updatedAt: new Date().toISOString() };
}

export const health = async () => ({
  status: 'ok',
  language: 'c++',
  compiler: COMPILER_NAME,
  storage: 'this browser'
});

export const listFiles = async () => {
  const stored = readStore();
  if (stored) return stored;
  const seeded = SEED.map((f) => stamp(f.name, f.content));
  writeStore(seeded);
  return seeded;
};

export const saveFile = async (name, content) => {
  const files = (await listFiles()).filter((f) => f.name !== name);
  const file = stamp(name, content);
  files.push(file);
  files.sort((a, b) => a.name.localeCompare(b.name));
  writeStore(files);
  return file;
};

export const deleteFile = async (name) => {
  writeStore((await listFiles()).filter((f) => f.name !== name));
  return null;
};

// --- running: Compiler Explorer ------------------------------------------
// Diagnostics come back carrying ANSI escapes — not only colour (ESC[01m)
// but erase-line (ESC[K) too, so match any CSI sequence rather than just
// the ones ending in m.
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;?]*[A-Za-z]', 'g');

const joinLines = (lines) =>
  (lines || [])
    .map((l) => String(l.text ?? '').replace(ANSI, ''))
    .join('\n');

export const runCode = async (code, stdin = '') => {
  const res = await fetch(CE_URL + '/' + COMPILER + '/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      source: code,
      lang: 'c++',
      allowStoreCodeDebug: false,
      options: {
        userArguments: CXX_ARGS,
        executeParameters: { args: [], stdin },
        // executorRequest asks it to run the binary, not just show assembly.
        compilerOptions: { executorRequest: true },
        filters: { execute: true }
      }
    })
  });

  if (!res.ok) throw new Error('compiler service returned ' + res.status);

  const out = await res.json();
  const build = out.buildResult || {};
  const compileOk = build.code === 0;

  return {
    stdout: joinLines(out.stdout),
    // A failed build reports "Build failed" here; the detail is in
    // diagnostics, so do not repeat it.
    stderr: compileOk ? joinLines(out.stderr) : '',
    exitCode: compileOk ? out.code : null,
    timedOut: Boolean(out.timedOut),
    compileOk,
    compileTimedOut: false,
    diagnostics: joinLines(build.stderr),
    compileMs: build.execTime !== undefined ? Number(build.execTime) : undefined,
    durationMs: out.execTime !== undefined ? Number(out.execTime) : 0
  };
};
