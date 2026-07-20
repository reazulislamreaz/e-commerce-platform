/**
 * Prisma database seed entrypoint.
 *
 * Usage:
 *   npm run prisma:seed --workspace=backend
 *
 * See docs/DATABASE_SEED.md for architecture, env vars, and extension guide.
 */
import { createSeedPrisma } from './seed/client';
import { runSeed } from './seed/run';

async function main(): Promise<void> {
  const prisma = createSeedPrisma();
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
