import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

const PARTNERS = [
  {
    key: 'pathao',
    companyName: 'Pathao Courier',
    contactPerson: 'Pathao Support',
    phone: '+8809610010101',
    email: 'courier@supports.pathao.com',
    website: 'https://pathao.com',
    trackingUrlTemplate: 'https://pathao.com/track/{trackingNumber}',
  },
  {
    key: 'steadfast',
    companyName: 'SteadFast',
    contactPerson: 'SteadFast Support',
    phone: '+8809617617617',
    email: 'support@steadfast.com.bd',
    website: 'https://steadfast.com.bd',
    trackingUrlTemplate: 'https://steadfast.com.bd/t/{trackingNumber}',
  },
  {
    key: 'redx',
    companyName: 'RedX',
    contactPerson: 'RedX Support',
    phone: '+8809617611111',
    email: 'support@redx.com.bd',
    website: 'https://redx.com.bd',
    trackingUrlTemplate: 'https://redx.com.bd/track/{trackingNumber}',
  },
  {
    key: 'sundarban',
    companyName: 'Sundarban',
    contactPerson: 'Sundarban Courier',
    phone: '+8809612345678',
    email: 'info@sundarban.com.bd',
    website: 'https://sundarbancourier.com',
    trackingUrlTemplate: 'https://sundarbancourier.com/tracking/{trackingNumber}',
  },
  {
    key: 'paperfly',
    companyName: 'Paperfly',
    contactPerson: 'Paperfly Support',
    phone: '+8809613112233',
    email: 'support@paperfly.com.bd',
    website: 'https://paperfly.com.bd',
    trackingUrlTemplate: 'https://paperfly.com.bd/track/{trackingNumber}',
  },
  {
    key: 'sa-paribahan',
    companyName: 'SA Paribahan',
    contactPerson: 'SA Paribahan Desk',
    phone: '+8801711000001',
    email: 'info@saparibahan.com',
    website: 'https://saparibahan.com',
    trackingUrlTemplate: null,
  },
  {
    key: 'ecourier',
    companyName: 'eCourier',
    contactPerson: 'eCourier Support',
    phone: '+8809612223344',
    email: 'support@ecourier.com.bd',
    website: 'https://ecourier.com.bd',
    trackingUrlTemplate: 'https://ecourier.com.bd/tracking/{trackingNumber}',
  },
] as const;

export async function seedDeliveryPartners(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;
  let upserted = 0;

  for (const partner of PARTNERS) {
    const id = seedUuid(`delivery-partner:${partner.key}`);
    await prisma.deliveryPartner.upsert({
      where: { id },
      create: {
        id,
        companyName: partner.companyName,
        contactPerson: partner.contactPerson,
        phone: partner.phone,
        email: partner.email,
        website: partner.website,
        trackingUrlTemplate: partner.trackingUrlTemplate,
        isActive: true,
      },
      update: {
        companyName: partner.companyName,
        contactPerson: partner.contactPerson,
        phone: partner.phone,
        email: partner.email,
        website: partner.website,
        trackingUrlTemplate: partner.trackingUrlTemplate,
        isActive: true,
      },
    });
    upserted += 1;
  }

  seedLog(`Delivery partners upserted: ${upserted}`);
}
