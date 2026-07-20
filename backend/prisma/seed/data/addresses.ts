import type { DemoCustomerSpec } from './users';

export interface DemoAddressSpec {
  customerKey: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}

export const DEMO_ADDRESSES: DemoAddressSpec[] = [
  {
    customerKey: 'customer-rahim',
    label: 'Home',
    line1: 'House 12, Road 4, Dhanmondi',
    city: 'Dhaka',
    district: 'Dhaka',
    postalCode: '1209',
    isDefault: true,
  },
  {
    customerKey: 'customer-rahim',
    label: 'Office',
    line1: 'Level 5, Gulshan Avenue',
    line2: 'Near Plot 18',
    city: 'Dhaka',
    district: 'Dhaka',
    postalCode: '1212',
    isDefault: false,
  },
  {
    customerKey: 'customer-nadia',
    label: 'Home',
    line1: 'Apt 3B, Banani Road 11',
    city: 'Dhaka',
    district: 'Dhaka',
    postalCode: '1213',
    isDefault: true,
  },
  {
    customerKey: 'customer-farhan',
    label: 'Home',
    line1: 'Holding 45, Agrabad C/A',
    city: 'Chattogram',
    district: 'Chattogram',
    postalCode: '4100',
    isDefault: true,
  },
  {
    customerKey: 'customer-mehreen',
    label: 'Home',
    line1: 'House 7, Mirpur DOHS',
    city: 'Dhaka',
    district: 'Dhaka',
    postalCode: '1216',
    isDefault: true,
  },
  {
    customerKey: 'customer-sakib',
    label: 'Home',
    line1: 'Flat A2, Kazir Dewri',
    city: 'Chattogram',
    district: 'Chattogram',
    postalCode: '4000',
    isDefault: true,
  },
  {
    customerKey: 'customer-anika',
    label: 'Home',
    line1: 'House 22, Sonadanga R/A',
    city: 'Khulna',
    district: 'Khulna',
    postalCode: '9100',
    isDefault: true,
  },
];

export function addressKey(spec: DemoAddressSpec): string {
  return `address:${spec.customerKey}:${spec.label.toLowerCase()}`;
}

export function defaultAddressFor(
  customers: DemoCustomerSpec[],
  customerKey: string,
): DemoAddressSpec {
  const match = DEMO_ADDRESSES.find((a) => a.customerKey === customerKey && a.isDefault);
  if (!match) {
    throw new Error(`No default address for ${customerKey} (known: ${customers.map((c) => c.key).join(',')})`);
  }
  return match;
}
