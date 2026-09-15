// File storage. Uses Postgres when DATABASE_URL is set (Render provisions
// it from render.yaml); falls back to an in-memory map so the container
// still runs locally and in Kubernetes without a database.

// Starter files, kept as real .cpp on disk under seed/. Embedding C++ in a
// JS template literal means hand-escaping every newline escape in the
// source; reading the files avoids that whole class of bug.
const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, 'seed');
const SEED = fs
  .readdirSync(SEED_DIR)
  .filter((f) => f.endsWith('.cpp'))
  .sort()
  .map((name) => ({
    name,
    content: fs.readFileSync(path.join(SEED_DIR, name), 'utf8')
  }));

let kind = 'memory';
let pool = null;
const memory = new Map();

async function init() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const url = process.env.DATABASE_URL;
    // Render requires SSL; the Postgres container in docker-compose does
    // not offer it, so only ask for SSL when the host is not local.
    const isLocal = /@(localhost|127\.0\.0\.1|db|postgres)[:/]/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false }
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
