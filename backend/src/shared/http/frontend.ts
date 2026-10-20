import { join } from 'node:path';
import express, { type RequestHandler, Router } from 'express';

function isApiPath(path: string) {
  return path === '/api' || path.startsWith('/api/');
}

// Serves the built SPA under the same origin. /api never receives HTML.
export function frontendRoutes(distDir: string) {
  const router = Router();
  const assets = express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      // Vite fingerprints everything under assets/; other files may change.
      res.set(
        'Cache-Control',
        filePath.startsWith(join(distDir, 'assets'))
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      );
    },
  });
  const fallback: RequestHandler = (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || isApiPath(req.path))
      return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: distDir }, next);
  };

  router.use((req, res, next) =>
    isApiPath(req.path) ? next() : assets(req, res, next),
  );
  router.use(fallback);
  return router;
}
