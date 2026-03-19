import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const backendOrigin = (process.env['TCGLIB_API_URL'] ?? 'http://localhost:5059').replace(/\/$/, '');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Proxy browser-side API calls to the .NET backend.
 */
app.get('/api/{*splat}', async (req, res, next) => {
  try {
    const targetUrl = new URL(req.originalUrl, `${backendOrigin}/`);
    const response = await fetch(targetUrl, {
      headers: {
        accept: req.headers.accept ?? 'application/json',
      },
    });
    const contentType = response.headers.get('content-type');

    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    res.status(response.status).send(await response.text());
  } catch (error) {
    next(error);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
