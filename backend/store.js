// File storage. Uses Postgres when DATABASE_URL is set (Render provisions
// it from render.yaml); falls back to an in-memory map so the container
// still runs locally and in Kubernetes without a database.

const SEED = [
  {
    name: 'main.js',
    content: `// Press Run (or Ctrl+Enter). This executes on the server.
const squares = [1, 2, 3, 4, 5].map((n) => n * n);
console.log('squares:', squares);
console.log('node:', process.version);
`
  },
  {
    name: 'scratch.js',
    content: `// Anything you write here runs with a 5s timeout.
for (let i = 0; i < 3; i++) console.log('tick', i);
`
  }
];

let kind = 'memory';
let pool = null;
const memory = new Map();

async function init() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        name       TEXT PRIMARY KEY,
        content    TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM files');
    if (rows[0].n === 0) {
      for (const f of SEED) await save(f.name, f.content);
    }
    kind = 'postgres';
  } else {
    for (const f of SEED) memory.set(f.name, { ...f, updatedAt: new Date().toISOString() });
    kind = 'memory';
  }
  module.exports.kind = kind;
}

async function list() {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT name, content, updated_at FROM files ORDER BY name'
    );
    return rows.map((r) => ({
      name: r.name,
      content: r.content,
      updatedAt: r.updated_at
    }));
  }
  return [...memory.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function save(name, content) {
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO files (name, content) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET content = $2, updated_at = now()
       RETURNING name, content, updated_at`,
      [name, content]
    );
    return {
      name: rows[0].name,
      content: rows[0].content,
      updatedAt: rows[0].updated_at
    };
  }
  const file = { name, content, updatedAt: new Date().toISOString() };
  memory.set(name, file);
  return file;
}

async function remove(name) {
  if (pool) {
    await pool.query('DELETE FROM files WHERE name = $1', [name]);
    return;
  }
  memory.delete(name);
}

module.exports = { init, list, save, remove, kind };
