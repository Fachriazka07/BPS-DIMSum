import express from 'express';
import { allAsync, runAsync, getAsync } from '../db.js';

const router = express.Router();

function logOp(action, table, ok, err) {
  if (ok) console.log(`[SQLite] ${action} ${table} success`);
  else console.log(`[SQLite] ${action} ${table} failed: ${err?.message || err}`);
}

async function resolveTable() {
  const candidates = ['tbinfografiskategori', 'kategori_infografis'];
  for (const name of candidates) {
    try {
      const row = await getAsync('SELECT name FROM sqlite_master WHERE type = "table" AND name = ?', [name]);
      if (row && row.name) return name;
    } catch (_) { /* try next */ }
  }
  try {
    const likeRows = await allAsync("SELECT name FROM sqlite_master WHERE type='table' AND lower(name) LIKE '%kategori%' AND (lower(name) LIKE '%info%' OR lower(name) LIKE '%graf%')");
    const first = likeRows && likeRows[0] && likeRows[0].name;
    if (first) return first;
  } catch (_) {}
  return candidates[0];
}

async function getCols(table) {
  const rows = await allAsync(`PRAGMA table_info(${table})`);
  return rows.map(r => r.name);
}
function resolveIdCol(cols) {
  if (cols.includes('id')) return 'id';
  if (cols.includes('rowid')) return 'rowid';
  return 'rowid';
}
function resolveNameCol(cols) {
  if (cols.includes('nama_kategori')) return 'nama_kategori';
  if (cols.includes('nama')) return 'nama';
  if (cols.includes('kategori')) return 'kategori';
  if (cols.includes('name')) return 'name';
  return cols.find(c => c !== 'id' && c !== 'rowid') || 'nama_kategori';
}

router.get('/', async (req, res) => {
  try {
    const table = await resolveTable();
    const cols = await getCols(table);
    const idCol = resolveIdCol(cols);
    const nameCol = resolveNameCol(cols);
    const rows = await allAsync(`SELECT ${idCol} AS id, ${nameCol} AS nama_kategori FROM ${table} ORDER BY ${idCol} DESC`);
    logOp('GET', table, true);
    res.json(rows);
  } catch (err) {
    logOp('GET', 'tbinfografiskategori', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const table = await resolveTable();
    const cols = await getCols(table);
    const idCol = resolveIdCol(cols);
    const nameCol = resolveNameCol(cols);
    const row = await getAsync(`SELECT ${idCol} AS id, ${nameCol} AS nama_kategori FROM ${table} WHERE ${idCol} = ?`, [req.params.id]);
    logOp('GET BY ID', table, true);
    res.json(row || null);
  } catch (err) {
    logOp('GET BY ID', 'tbinfografiskategori', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const table = await resolveTable();
    const cols = await getCols(table);
    const idCol = resolveIdCol(cols);
    const nameCol = resolveNameCol(cols);
    const body = req.body || {};
    let insertCol = nameCol;
    // map incoming nama_kategori if column differs
    const value = body.nama_kategori ?? body[nameCol] ?? body.nama ?? body.kategori ?? body.name;
    if (value === undefined) return res.status(400).json({ error: 'nama_kategori is required' });
    const sql = `INSERT INTO ${table} (${insertCol}) VALUES (?)`;
    const result = await runAsync(sql, [value]);
    logOp('INSERT', table, true);
    const created = await getAsync(`SELECT ${idCol} AS id, ${nameCol} AS nama_kategori FROM ${table} WHERE ${idCol} = ?`, [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    logOp('INSERT', 'tbinfografiskategori', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const table = await resolveTable();
    const cols = await getCols(table);
    const idCol = resolveIdCol(cols);
    const nameCol = resolveNameCol(cols);
    const body = req.body || {};
    const value = body.nama_kategori ?? body[nameCol] ?? body.nama ?? body.kategori ?? body.name;
    if (value === undefined) return res.status(400).json({ error: 'No valid fields to update' });
    const sql = `UPDATE ${table} SET ${nameCol} = ? WHERE ${idCol} = ?`;
    await runAsync(sql, [value, req.params.id]);
    logOp('UPDATE', table, true);
    const row = await getAsync(`SELECT ${idCol} AS id, ${nameCol} AS nama_kategori FROM ${table} WHERE ${idCol} = ?`, [req.params.id]);
    res.json(row);
  } catch (err) {
    logOp('UPDATE', 'tbinfografiskategori', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const table = await resolveTable();
    const cols = await getCols(table);
    const idCol = resolveIdCol(cols);
    await runAsync(`DELETE FROM ${table} WHERE ${idCol} = ?`, [req.params.id]);
    logOp('DELETE', table, true);
    res.json({ deleted: true });
  } catch (err) {
    logOp('DELETE', 'tbinfografiskategori', false, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;