import type { Prisma } from '@/generated/prisma/client';

function addField(fields: Set<string>, value: string): void {
  const cleaned = value.replaceAll(/["'`]/g, '').trim();
  if (!cleaned) return;
  // Ignore prose from Prisma's default message ("Unique constraint failed…").
  if (/^(unique|constraint|failed|on|the|fields?)$/i.test(cleaned)) return;
  fields.add(cleaned);
}

function collect(fields: Set<string>, value: unknown): void {
  if (typeof value === 'string' && value.trim()) {
    // Prefer structured tokens; also pull Postgres constraint names from prose.
    const constraint = /unique constraint ["'`]?([\w.]+)["'`]?/i.exec(value);
    if (constraint?.[1]) addField(fields, constraint[1]);
    const keyFields = /Key \(([^)]+)\)/i.exec(value);
    if (keyFields?.[1]) {
      for (const part of keyFields[1].split(',')) addField(fields, part);
    }
    for (const part of value.split(/[,\s]+/)) addField(fields, part);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(fields, item);
  }
}

/**
 * Resolves which unique field(s) caused a Prisma P2002 error.
 * Prisma 7 + driver adapters may put the answer in `meta.target`, a constraint
 * name, or nested `driverAdapterError.cause.constraint` — never assume one shape.
 */
export function uniqueConflictFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const fields = new Set<string>();

  collect(fields, error.meta?.target);

  const driver = error.meta?.driverAdapterError as
    | { cause?: { constraint?: { fields?: unknown; index?: unknown }; originalMessage?: string } }
    | undefined;
  const constraint = driver?.cause?.constraint;
  if (constraint) {
    collect(fields, constraint.fields);
    collect(fields, constraint.index);
  }
  if (driver?.cause?.originalMessage) collect(fields, driver.cause.originalMessage);

  return [...fields];
}

/** True when a P2002 conflict clearly involves the given column (e.g. phone / email). */
export function uniqueConflictIncludes(
  error: Prisma.PrismaClientKnownRequestError,
  column: string,
): boolean {
  const needle = column.toLowerCase();
  return uniqueConflictFields(error).some((field) => {
    const normalized = field.toLowerCase().replaceAll(/["'`]/g, '');
    return (
      normalized === needle ||
      normalized.endsWith(`_${needle}`) ||
      normalized.includes(`_${needle}_`) ||
      normalized.endsWith(`.${needle}`)
    );
  });
}
