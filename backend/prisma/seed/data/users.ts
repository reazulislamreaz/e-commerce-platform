import { seedUuid } from '../utils/ids';

export interface DemoCustomerSpec {
  key: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export const DEMO_CUSTOMERS: DemoCustomerSpec[] = [
  {
    key: 'customer-rahim',
    email: 'rahim.khan@elevateapparel.demo',
    phone: '01711000001',
    firstName: 'Rahim',
    lastName: 'Khan',
  },
  {
    key: 'customer-nadia',
    email: 'nadia.sultan@elevateapparel.demo',
    phone: '01711000002',
    firstName: 'Nadia',
    lastName: 'Sultan',
  },
  {
    key: 'customer-farhan',
    email: 'farhan.ahmed@elevateapparel.demo',
    phone: '01711000003',
    firstName: 'Farhan',
    lastName: 'Ahmed',
  },
  {
    key: 'customer-mehreen',
    email: 'mehreen.chowdhury@elevateapparel.demo',
    phone: '01711000004',
    firstName: 'Mehreen',
    lastName: 'Chowdhury',
  },
  {
    key: 'customer-sakib',
    email: 'sakib.hasan@elevateapparel.demo',
    phone: '01711000005',
    firstName: 'Sakib',
    lastName: 'Hasan',
  },
  {
    key: 'customer-anika',
    email: 'anika.rahman@elevateapparel.demo',
    phone: '01711000006',
    firstName: 'Anika',
    lastName: 'Rahman',
  },
];

export const DEMO_ADMIN_KEY = 'staff-admin';
export const DEMO_ADMIN_ID = seedUuid(DEMO_ADMIN_KEY);

export function demoCustomerId(key: string): string {
  return seedUuid(key);
}
