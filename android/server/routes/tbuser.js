import express from 'express';
import { allAsync, runAsync, getAsync } from '../db.js';

const router = express.Router();

function logOp(action, table, ok, err) {
  if (ok) console.log(`[SQLite] ${action} ${table} success`);
  else console.log(`[SQLite] ${action} ${table} failed: ${err?.message || err}`);
}

router.get('/', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM tbuser ORDER BY id DESC');
    logOp('GET', 'tbuser', true);
    res.json(rows);
  } catch (err) {
    logOp('GET', 'tbuser', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getAsync('SELECT * FROM tbuser WHERE id = ?', [req.params.id]);
    logOp('GET BY ID', 'tbuser', true);
    res.json(row || null);
  } catch (err) {
    logOp('GET BY ID', 'tbuser', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const keys = Object.keys(body);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO tbuser (${keys.join(',')}) VALUES (${placeholders})`;
    const result = await runAsync(sql, keys.map((k) => body[k]));
    logOp('INSERT', 'tbuser', true);
    const created = await getAsync('SELECT * FROM tbuser WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    logOp('INSERT', 'tbuser', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const keys = Object.keys(body);
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const assignments = keys.map((k) => `${k}=?`).join(', ');
    const sql = `UPDATE tbuser SET ${assignments} WHERE id = ?`;
    const values = keys.map((k) => body[k]);
    values.push(req.params.id);
    await runAsync(sql, values);
    logOp('UPDATE', 'tbuser', true);
    const row = await getAsync('SELECT * FROM tbuser WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    logOp('UPDATE', 'tbuser', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM tbuser WHERE id = ?', [req.params.id]);
    logOp('DELETE', 'tbuser', true);
    res.json({ deleted: true });
  } catch (err) {
    logOp('DELETE', 'tbuser', false, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;