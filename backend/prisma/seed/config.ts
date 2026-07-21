import { normalizeBdPhone } from './utils/phone';

export type SeedProfile = 'core' | 'full';

export interface SeedConfig {
  /** When true, the orchestrator exits without writing. */
  skip: boolean;
  skipReason?: string;
  nodeEnv: string;
  isProduction: boolean;
  profile: SeedProfile;
  superAdmin: {
    email: string;
    password: string;
    phone: string;
  };
  admin: {
    email: string;
    password: string;
    phone: string;
  };
  /** Shared password for all demo customer accounts. */
  demoCustomerPassword: string;
  /** When false, only identity + catalog + promotions + banners + alerts. */
  includeCommerceDemo: boolean;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function parseProfile(raw: string | undefined): SeedProfile {
  if (raw === 'core' || raw === 'full') return raw;
  return 'full';
}

/**
 * Resolves seed behaviour from environment variables.
 *
 * Seed runs by default (including production) so deploy demos get catalog data.
 * Disable explicitly with:
 *   - SEED_ENABLED=false  (any environment)
 *   - ENABLE_PRODUCTION_SEED=false  (when NODE_ENV=production)
 *
 * Set SEED_PROFILE=core for catalog/admin-only (no carts/orders/CRM demo graph).
 * Set SEED_COMMERCE_DEMO=false to keep full profile identity/catalog without commerce demo rows.
 */
export function loadSeedConfig(): SeedConfig {
  const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
  const isProduction = nodeEnv === 'production';
  // Opt-out: unset / any value other than "false" allows seeding in production.
  const enableProductionSeed = process.env.ENABLE_PRODUCTION_SEED !== 'false';
  const forceSkip = process.env.SEED_ENABLED === 'false';

  if (forceSkip) {
    return {
      skip: true,
      skipReason: 'SEED_ENABLED=false',
      nodeEnv,
      isProduction,
      profile: 'core',
      superAdmin: { email: '', password: '', phone: '' },
      admin: { email: '', password: '', phone: '' },
      demoCustomerPassword: '',
      includeCommerceDemo: false,
    };
  }

  if (isProduction && !enableProductionSeed) {
    return {
      skip: true,
      skipReason: 'NODE_ENV=production and ENABLE_PRODUCTION_SEED=false — refusing to seed',
      nodeEnv,
      isProduction,
      profile: 'core',
      superAdmin: { email: '', password: '', phone: '' },
      admin: { email: '', password: '', phone: '' },
      demoCustomerPassword: '',
      includeCommerceDemo: false,
    };
  }

  const superAdminPassword = requireEnv('SEED_SUPER_ADMIN_PASSWORD');
  if (superAdminPassword.length < 6) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 6 characters');
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || 'AdminDemoPass123';
  if (adminPassword.length < 6) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 6 characters');
  }

  const demoCustomerPassword = process.env.SEED_DEMO_PASSWORD?.trim() || 'CustomerDemoPass123';
  if (demoCustomerPassword.length < 6) {
    throw new Error('SEED_DEMO_PASSWORD must be at least 6 characters');
  }

  const profile = parseProfile(process.env.SEED_PROFILE);
  const includeCommerceDemo = profile === 'full' && process.env.SEED_COMMERCE_DEMO !== 'false';

  return {
    skip: false,
    nodeEnv,
    isProduction,
    profile,
    superAdmin: {
      email: requireEnv('SEED_SUPER_ADMIN_EMAIL').toLowerCase(),
      password: superAdminPassword,
      phone: normalizeBdPhone(requireEnv('SEED_SUPER_ADMIN_PHONE')),
    },
    admin: {
      email: (process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@elevateapparel.demo').toLowerCase(),
      password: adminPassword,
      phone: normalizeBdPhone(process.env.SEED_ADMIN_PHONE?.trim() || '01710000002'),
    },
    demoCustomerPassword,
    includeCommerceDemo,
  };
}
