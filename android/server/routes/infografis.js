import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { allAsync, runAsync, getAsync } from '../db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Simpan langsung ke folder yang dibaca frontend
    // Basis pakai process.cwd() (server dijalankan dari .../android/server)
    // target: .../android/app/src/main/assets/public/sqlite/infografis
    const androidRoot = path.resolve(process.cwd(), '..');
    const publicInfografisDir = path.resolve(
      androidRoot,
      'app/src/main/assets/public/sqlite/infografis'
    );
    try {
      console.log('[Infografis] Upload destination:', publicInfografisDir);
      if (!fs.existsSync(publicInfografisDir)) {
        fs.mkdirSync(publicInfografisDir, { recursive: true });
      }
    } catch (_) {
      // abaikan error mkdir; multer akan tetap mencoba menulis
    }
    cb(null, publicInfografisDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const uploadImage = multer({ storage: imagesStorage });

async function getCols(table) {
  const rows = await allAsync(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}
async function getFileCol(table) {
  const cols = await getCols(table);
  if (cols.includes('file_url')) return 'file_url';
  if (cols.includes('image_url')) return 'image_url';
  return 'file_url';
}

function logOp(action, table, ok, err) {
  if (ok) console.log(`[SQLite] ${action} ${table} success`);
  else console.log(`[SQLite] ${action} ${table} failed: ${err?.message || err}`);
}

// copyToPublicInfografis tidak diperlukan lagi karena penyimpanan langsung ke public

function deleteFromStoragesInfografis(filename) {
  if (!filename) return;
  try {
    const uploadsPath = path.resolve(__dirname, '../uploads/images', filename);
    if (fs.existsSync(uploadsPath)) fs.unlinkSync(uploadsPath);
  } catch (e) { /* ignore */ }
  try {
    // Basis pakai process.cwd() -> .../android/server -> naik satu ke .../android
    const androidRoot = path.resolve(process.cwd(), '..');
    const publicRoot = path.resolve(androidRoot, 'app/src/main/assets/public');
    const publicPath = path.join(publicRoot, 'sqlite', 'infografis', filename);
    if (fs.existsSync(publicPath)) fs.unlinkSync(publicPath);
  } catch (e) { /* ignore */ }
}

router.get('/', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM infografis ORDER BY id DESC');
    logOp('GET', 'infografis', true);
    res.json(rows);
  } catch (err) {
    logOp('GET', 'infografis', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getAsync('SELECT * FROM infografis WHERE id = ?', [req.params.id]);
    logOp('GET BY ID', 'infografis', true);
    res.json(row || null);
  } catch (err) {
    logOp('GET BY ID', 'infografis', false, err);
    res.status(500).json({ error: err.message });
  }
});

// Field file: 'image'
router.post('/', uploadImage.single('image'), async (req, res) => {
  try {
    const cols = await getCols('infografis');
    const body = req.body || {};
    const fileCol = await getFileCol('infografis');

    const insertCols = Object.keys(body).filter((k) => cols.includes(k));
    let fileUrl = null;
    if (req.file) {
      // Simpan URL langsung ke lokasi yang dibaca frontend
      fileUrl = `/sqlite/infografis/${req.file.filename}`;
      if (cols.includes(fileCol)) insertCols.push(fileCol);
    }
    const values = insertCols.map((k) => (k === fileCol ? fileUrl : body[k]));
    const placeholders = insertCols.map(() => '?').join(',');
    const sql = `INSERT INTO infografis (${insertCols.join(',')}) VALUES (${placeholders})`;

    const result = await runAsync(sql, values);
    logOp('INSERT', 'infografis', true);
    const created = await getAsync('SELECT * FROM infografis WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    logOp('INSERT', 'infografis', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', uploadImage.single('image'), async (req, res) => {
  try {
    const cols = await getCols('infografis');
    const body = req.body || {};
    const fileCol = await getFileCol('infografis');
    const old = await getAsync('SELECT * FROM infografis WHERE id = ?', [req.params.id]);

    const setCols = Object.keys(body).filter((k) => cols.includes(k));
    let fileUrl = null;
    if (req.file) {
      // Simpan URL langsung ke lokasi yang dibaca frontend
      fileUrl = `/sqlite/infografis/${req.file.filename}`;
      // hapus file lama jika ada
      try {
        const oldUrl = old ? (old[fileCol] || old.image_url || old.file_url) : null;
        const oldName = oldUrl ? String(oldUrl).split('?')[0].split('/').pop() : null;
        deleteFromStoragesInfografis(oldName);
      } catch (_) { /* ignore */ }
      if (cols.includes(fileCol)) setCols.push(fileCol);
    }
    if (setCols.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const assignments = setCols.map((c) => `${c}=?`).join(', ');
    const values = setCols.map((c) => (c === fileCol ? fileUrl : body[c]));
    values.push(req.params.id);
    const sql = `UPDATE infografis SET ${assignments} WHERE id = ?`;
    await runAsync(sql, values);
    logOp('UPDATE', 'infografis', true);
    const row = await getAsync('SELECT * FROM infografis WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    logOp('UPDATE', 'infografis', false, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // ambil record untuk mengetahui nama file sebelum dihapus
    const fileCol = await getFileCol('infografis');
    const row = await getAsync('SELECT * FROM infografis WHERE id = ?', [req.params.id]);
    await runAsync('DELETE FROM infografis WHERE id = ?', [req.params.id]);
    try {
      const url = row ? (row[fileCol] || row.image_url || row.file_url) : null;
      const name = url ? String(url).split('?')[0].split('/').pop() : null;
      deleteFromStoragesInfografis(name);
    } catch (_) { /* ignore */ }
    logOp('DELETE', 'infografis', true);
    res.json({ deleted: true });
  } catch (err) {
    logOp('DELETE', 'infografis', false, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;