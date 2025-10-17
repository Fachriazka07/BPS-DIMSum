import express from 'express';
import { allAsync, runAsync, getAsync } from '../db.js';

const router = express.Router();

function logOp(action, table, ok, err) {
  if (ok) console.log(`[SQLite] ${action} ${table} success`);
  else console.log(`[SQLite] ${action} ${table} failed: ${err?.message || err}`);
}

async function resolveTable() {
  const candidates = ['kategori_tbstatistik', 'kategori_statistik'];
  for (const name of candidates) {
    try {
      const row = await getAsync('SELECT name FROM sqlite_master WHERE type = "table" AND name = ?', [name]);
      if (row && row.name) return name;
    } catch (_) { /* try next */ }
  }
  return candidates[0];
}

router.get('/', async (req, res) => {
  try {
    const table = await resolveTable();
    const rows = await allAsync(`SELECT * FROM ${table} ORDER BY id DESC`);
    logOp('GET', table, true);
    res.json(rows);
  } catch (err) {
    logOp('GET', 'kategori_tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const table = await resolveTable();
    const row = await getAsync(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
    logOp('GET BY ID', table, true);
    res.json(row || null);
  } catch (err) {
    logOp('GET BY ID', 'kategori_tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const table = await resolveTable();
    const body = req.body || {};
    const keys = Object.keys(body);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
    const result = await runAsync(sql, keys.map((k) => body[k]));
    logOp('INSERT', table, true);
    const created = await getAsync(`SELECT * FROM ${table} WHERE id = ?`, [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    logOp('INSERT', 'kategori_tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const table = await resolveTable();
    const body = req.body || {};
    const keys = Object.keys(body);
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const assignments = keys.map((k) => `${k}=?`).join(', ');
    const sql = `UPDATE ${table} SET ${assignments} WHERE id = ?`;
    const values = keys.map((k) => body[k]);
    values.push(req.params.id);
    await runAsync(sql, values);
    logOp('UPDATE', table, true);
    const row = await getAsync(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
    res.json(row);
  } catch (err) {
    logOp('UPDATE', 'kategori_tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const table = await resolveTable();
    await runAsync(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    logOp('DELETE', table, true);
    res.json({ deleted: true });
  } catch (err) {
    logOp('DELETE', 'kategori_tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;