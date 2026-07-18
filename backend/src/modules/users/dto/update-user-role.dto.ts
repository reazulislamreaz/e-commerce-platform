import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Role } from '@prisma/client';

const ASSIGNABLE_ROLES = [Role.ADMIN, Role.CUSTOMER] as const;

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES, description: 'SUPER_ADMIN can never be assigned' })
  @IsIn(ASSIGNABLE_ROLES)
  role!: (typeof ASSIGNABLE_ROLES)[number];
}
