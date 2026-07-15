export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VENDOR' | 'CUSTOMER';
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
}
