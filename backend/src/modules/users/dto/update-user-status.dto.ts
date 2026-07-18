import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserStatus } from '@/generated/prisma/client';

const ASSIGNABLE_STATUSES = [UserStatus.ACTIVE, UserStatus.SUSPENDED] as const;

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ASSIGNABLE_STATUSES, description: 'PENDING cannot be assigned' })
  @IsIn(ASSIGNABLE_STATUSES)
  status!: (typeof ASSIGNABLE_STATUSES)[number];
}
