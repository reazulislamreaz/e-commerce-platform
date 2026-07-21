import { Prisma } from '@/generated/prisma/client';
import { uniqueConflictFields, uniqueConflictIncludes } from './prisma-unique-conflict';

function p2002(
  meta: Record<string, unknown>,
  message = 'Unique constraint failed',
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code: 'P2002',
    clientVersion: 'test',
    meta,
  });
}

describe('uniqueConflictFields', () => {
  it('reads classic meta.target field names', () => {
    expect(uniqueConflictFields(p2002({ target: ['phone'] }))).toEqual(['phone']);
    expect(uniqueConflictIncludes(p2002({ target: ['phone'] }), 'phone')).toBe(true);
    expect(uniqueConflictIncludes(p2002({ target: ['email'] }), 'phone')).toBe(false);
  });

  it('detects phone from PostgreSQL constraint names', () => {
    const error = p2002({ target: ['User_phone_key'] });
    expect(uniqueConflictIncludes(error, 'phone')).toBe(true);
    expect(uniqueConflictIncludes(error, 'email')).toBe(false);
  });

  it('reads driver-adapter constraint fields when meta.target is missing', () => {
    const error = p2002({
      driverAdapterError: {
        cause: {
          kind: 'UniqueConstraintViolation',
          originalMessage: 'duplicate key value violates unique constraint "User_phone_key"',
          constraint: { fields: ['phone'] },
        },
      },
    });
    expect(uniqueConflictIncludes(error, 'phone')).toBe(true);
  });

  it('falls back to originalMessage constraint name', () => {
    const error = p2002({
      driverAdapterError: {
        cause: {
          originalMessage: 'duplicate key value violates unique constraint "User_email_key"',
        },
      },
    });
    expect(uniqueConflictIncludes(error, 'email')).toBe(true);
  });
});
