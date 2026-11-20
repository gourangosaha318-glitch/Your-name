import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabaseSchemaAndSeed } from './server/db';
import { authUsersRouter } from './server/routes/authUsersRouter';
import { salesStockRouter } from './server/routes/salesStockRouter';
import { vouchersBankRouter } from './server/routes/vouchersBankRouter';
import { millOpsRouter } from './server/routes/millOpsRouter';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  // Initialize SQLite schema & seed initial records non-destructively
  initDatabaseSchemaAndSeed();

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API routes
  app.use('/api', authUsersRouter);
  app.use('/api', salesStockRouter);
  app.use('/api', vouchersBankRouter);
  app.use('/api', millOpsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Ma Flower Mill API' });
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'অনুরোধকৃত API রুট পাওয়া যায়নি।' });
  });

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ma Flower Mill server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
