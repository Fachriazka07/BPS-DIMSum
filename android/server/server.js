import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import infografisRouter from './routes/infografis.js';
import tbstatistikRouter from './routes/tbstatistik.js';
import tbinfografiskategoriRouter from './routes/tbinfografiskategori.js';
import kategoriTbstatistikRouter from './routes/kategori_tbstatistik.js';
import tbuserRouter from './routes/tbuser.js';

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan folder uploads tersedia
const uploadsDir = path.resolve(__dirname, './uploads');
const imagesDir = path.join(uploadsDir, 'images');
const excelDir = path.join(uploadsDir, 'excel');
[uploadsDir, imagesDir, excelDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Static untuk preview file
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/infografis', infografisRouter);
app.use('/api/tbstatistik', tbstatistikRouter);
app.use('/api/tbinfografiskategori', tbinfografiskategoriRouter);
app.use('/api/kategori_tbstatistik', kategoriTbstatistikRouter);
app.use('/api/tbuser', tbuserRouter);

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`[Server] Express running on http://localhost:${PORT}`);
});