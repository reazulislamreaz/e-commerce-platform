import { RegisterDto } from '@/modules/auth/dto/register.dto';

/** Same identity fields and validation as registration; role is fixed to ADMIN server-side. */
export class CreateAdminDto extends RegisterDto {}
