export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
export interface AuthUser {
  id: string;
  email: string;
  /** Bangladeshi mobile number in E.164 format (+8801XXXXXXXXX). */
  phone?: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
}
