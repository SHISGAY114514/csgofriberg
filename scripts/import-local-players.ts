import fs from 'node:fs';
import { config } from '../server/src/config';
import { db } from '../server/src/db/knex';
import { ensureSchema } from '../server/src/db/schema';
import { initRedis, closeRedis } from '../server/src/redis';
import { importPlayers, playerImportSchema } from '../server/src/services/playerMutations';

async function main() {
  if (process.env.NODE_ENV === 'production' || config.dbClient !== 'sqlite') {
    throw new Error('This helper is only for local SQLite development.');
  }
  const file = process.argv[2];
  if (!file) throw new Error('Usage: tsx scripts/import-local-players.ts <players.json>');
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const { players } = playerImportSchema.parse({ players: Array.isArray(data) ? data : data.players });
  // An explicit full import does not need the five demo seeds.
  await ensureSchema();
  await initRedis();
  console.log(await importPlayers(players));
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await closeRedis(); await db.destroy(); });
