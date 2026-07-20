export function seedLog(message: string): void {
  // Prisma seed runs as a CLI script; intentional stdout for operator feedback.
  process.stdout.write(`[seed] ${message}\n`);
}
