import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Production image cannot run raw `ts-node *.ts` (ERR_UNKNOWN_FILE_EXTENSION).
    // scripts/run-seed.sh uses tsx, which works in local + Docker migrate jobs.
    seed: 'sh ./scripts/run-seed.sh',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
