import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { allAsync, runAsync, getAsync } from '../db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Simpan langsung ke folder yang dibaca frontend: public/sqlite/TBSexcel
    const androidRoot = path.resolve(process.cwd(), '..');
    const publicExcelDir = path.resolve(androidRoot, 'app/src/main/assets/public/sqlite/TBSexcel');
    console.log('[tbstatistik] Upload destination:', publicExcelDir);
    if (!fs.existsSync(publicExcelDir)) fs.mkdirSync(publicExcelDir, { recursive: true });
    cb(null, publicExcelDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const uploadExcel = multer({ storage: excelStorage });

async function getCols(table) {
  const rows = await allAsync(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}
function logOp(action, table, ok, err) {
  if (ok) console.log(`[SQLite] ${action} ${table} success`);
  else console.log(`[SQLite] ${action} ${table} failed: ${err?.message || err}`);
}

// copyToPublicExcel tidak diperlukan lagi karena file disimpan langsung ke public/sqlite/TBSexcel

function deleteFromStoragesExcel(filename) {
  if (!filename) return;
  try {
    const uploadsPath = path.resolve(__dirname, '../uploads/excel', filename);
    if (fs.existsSync(uploadsPath)) fs.unlinkSync(uploadsPath);
  } catch (e) { /* ignore */ }
  try {
    const androidRoot = path.resolve(process.cwd(), '..');
    const publicRoot = path.resolve(androidRoot, 'app/src/main/assets/public');
    const publicPath = path.join(publicRoot, 'sqlite', 'TBSexcel', filename);
    if (fs.existsSync(publicPath)) fs.unlinkSync(publicPath);
  } catch (e) { /* ignore */ }
}

router.get('/', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM tbstatistik ORDER BY created_at DESC');
    logOp('GET', 'tbstatistik', true);
    res.json(rows);
  } catch (err) {
    logOp('GET', 'tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getAsync('SELECT * FROM tbstatistik WHERE id = ?', [req.params.id]);
    logOp('GET BY ID', 'tbstatistik', true);
    res.json(row || null);
  } catch (err) {
    logOp('GET BY ID', 'tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

// Field file: 'file'
router.post('/', uploadExcel.single('file'), async (req, res) => {
  try {
    const cols = await getCols('tbstatistik');
    const body = req.body || {};

    const insertCols = Object.keys(body).filter((k) => cols.includes(k));
    if (req.file) {
      if (cols.includes('file_url')) insertCols.push('file_url');
      body.file_url = `/sqlite/TBSexcel/${req.file.filename}`;
    }
    const values = insertCols.map((k) => body[k]);
    const placeholders = insertCols.map(() => '?').join(',');
    const sql = `INSERT INTO tbstatistik (${insertCols.join(',')}) VALUES (${placeholders})`;

    const result = await runAsync(sql, values);
    logOp('INSERT', 'tbstatistik', true);
    const created = await getAsync('SELECT * FROM tbstatistik WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    logOp('INSERT', 'tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', uploadExcel.single('file'), async (req, res) => {
  try {
    const cols = await getCols('tbstatistik');
    const body = req.body || {};
    const old = await getAsync('SELECT * FROM tbstatistik WHERE id = ?', [req.params.id]);

    const setCols = Object.keys(body).filter((k) => cols.includes(k));
    if (req.file) {
      if (cols.includes('file_url')) setCols.push('file_url');
      body.file_url = `/sqlite/TBSexcel/${req.file.filename}`;
      // hapus file lama jika ada
      try {
        const oldUrl = old ? old.file_url : null;
        const oldName = oldUrl ? String(oldUrl).split('?')[0].split('/').pop() : null;
        deleteFromStoragesExcel(oldName);
      } catch (_) { /* ignore */ }
    }
    if (setCols.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const assignments = setCols.map((c) => `${c}=?`).join(', ');
    const values = setCols.map((c) => body[c]);
    values.push(req.params.id);
    const sql = `UPDATE tbstatistik SET ${assignments} WHERE id = ?`;
    await runAsync(sql, values);
    logOp('UPDATE', 'tbstatistik', true);
    const row = await getAsync('SELECT * FROM tbstatistik WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    logOp('UPDATE', 'tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // ambil record untuk mengetahui nama file sebelum dihapus
    const row = await getAsync('SELECT * FROM tbstatistik WHERE id = ?', [req.params.id]);
    await runAsync('DELETE FROM tbstatistik WHERE id = ?', [req.params.id]);
    try {
      const url = row ? row.file_url : null;
      const name = url ? String(url).split('?')[0].split('/').pop() : null;
      deleteFromStoragesExcel(name);
    } catch (_) { /* ignore */ }
    logOp('DELETE', 'tbstatistik', true);
    res.json({ deleted: true });
  } catch (err) {
    logOp('DELETE', 'tbstatistik', false, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;