export const EMAIL_QUEUE = 'email';

export enum EmailJobName {
  VERIFICATION = 'verification-email',
}

export interface VerificationEmail {
  to: string;
  firstName: string;
  verifyUrl: string;
}
