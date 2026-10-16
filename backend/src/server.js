import app from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { ensureDefaultTemplates } from './services/email.js';
import { markStaleSync } from './services/sync.js';

async function main() {
  await prisma.$connect(); // fails loudly when DATABASE_URL is wrong or migrations were not applied
  await ensureDefaultTemplates();
  await markStaleSync();
  app.listen(config.port, () => console.log(`CRM API listening on :${config.port}`));
}

main().catch((e) => {
  console.error('Startup failed:', e.message);
  process.exit(1);
});
