// SQLite client utilities for browser usage
// Dynamically imports sql.js from CDN and opens local database under public/sqlite

export async function getDB() {
  const initSqlJsModule = await import('https://cdn.jsdelivr.net/npm/sql.js@1.9.0/dist/sql-wasm.js');
  const initSqlJs = initSqlJsModule.default;
  const SQL = await initSqlJs({ locateFile: (file) => 'https://cdn.jsdelivr.net/npm/sql.js@1.9.0/dist/' + file });

  const candidates = [
    '/sqlite/dimsum.db',
    'sqlite/dimsum.db',
    '../sqlite/dimsum.db',
    '../../sqlite/dimsum.db'
  ];
  let buffer = null;
  for (const rel of candidates) {
    try {
      const url = new URL(rel, window.location.href).href;
      const res = await fetch(url);
      if (res.ok) { buffer = await res.arrayBuffer(); break; }
    } catch (_) { /* try next */ }
  }
  if (!buffer) throw new Error('Tidak dapat memuat database SQLite: dimsum.db');
  return new SQL.Database(new Uint8Array(buffer));
}

export function execSelect(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function run(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
}

// Map remote/storage paths to local assets for infografis images
export function toLocalInfografisPath(url) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    const name = u.pathname.split('/').pop();
    if (!name) return url;
    return '/sqlite/infografis/' + name;
  } catch (_) {
    const name = String(url).split('/').pop();
    return name ? ('/sqlite/infografis/' + name) : url;
  }
}

// Map remote/storage excel paths to local assets/excel
export function toLocalExcelPath(url) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    const name = u.pathname.split('/').pop();
    if (!name) return url;
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return '/assets/excel/' + name;
    return url;
  } catch (_) {
    const name = String(url).split('/').pop();
    const ext = ((name || '').split('.').pop() || '').toLowerCase();
    if (name && (ext === 'xlsx' || ext === 'xls')) return '/assets/excel/' + name;
    return url;
  }
}