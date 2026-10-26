import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { env } from './config/env.js';

// In production the built client is served from server/public (the Docker image puts it there). Without a
// build the server answers the API only, as when the client is hosted somewhere else.
function clientDirectory() {
  if (env.NODE_ENV !== 'production') return null;
  const dir = path.join(import.meta.dirname, '../public');
  if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  console.warn('No client build in server/public: serving the API only.');
  return null;
}

createApp({ clientDir: clientDirectory() }).listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
