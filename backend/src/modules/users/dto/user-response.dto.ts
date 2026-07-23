import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@/generated/prisma/client';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ example: '+8801712345678', description: 'E.164 Bangladeshi mobile number' })
  phone!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  emailVerifiedAt!: Date | null;

  @ApiProperty({
    enum: ['EMAIL'],
    description: 'How the account was created (EMAIL until OAuth providers ship)',
  })
  registrationMethod!: 'EMAIL';

  @ApiProperty()
  emailVerified!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: Date | null;

  @ApiProperty({ description: 'Completed / placed order count (customers)' })
  orderCount!: number;

  @ApiProperty({ description: 'Lifetime spending in BDT taka (customers)' })
  totalSpending!: number;

  @ApiPropertyOptional({ nullable: true })
  adminNotes!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class UserAddressDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  line1!: string;

  @ApiPropertyOptional({ nullable: true })
  line2!: string | null;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  district!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty()
  country!: string;

  @ApiProperty({ enum: ['SHIPPING', 'BILLING'] })
  type!: 'SHIPPING' | 'BILLING';

  @ApiProperty()
  isDefault!: boolean;
}

export class UserOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class UserWishlistItemDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  addedAt!: Date;
}

export class UserReviewSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSlug!: string;

  @ApiProperty()
  rating!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class UserActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  href?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class UserLoginSessionDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  ip!: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  rememberMe!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  lastSeenAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  revokedAt!: Date | null;

  @ApiProperty()
  active!: boolean;
}

export class UserAuditEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  resourceType!: string;

  @ApiProperty()
  resourceId!: string;

  @ApiPropertyOptional({ nullable: true })
  actorUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  actorRole!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class UserDetailResponseDto extends UserResponseDto {
  @ApiProperty({ type: [UserAddressDto] })
  shippingAddresses!: UserAddressDto[];

  @ApiProperty({ type: [UserAddressDto] })
  billingAddresses!: UserAddressDto[];

  @ApiProperty({ type: [UserOrderSummaryDto] })
  orders!: UserOrderSummaryDto[];

  @ApiProperty({ type: [UserWishlistItemDto] })
  wishlist!: UserWishlistItemDto[];

  @ApiProperty({ type: [UserReviewSummaryDto] })
  reviews!: UserReviewSummaryDto[];

  @ApiProperty({ type: [UserActivityDto] })
  activity!: UserActivityDto[];

  @ApiProperty({ type: [UserLoginSessionDto] })
  loginHistory!: UserLoginSessionDto[];

  @ApiProperty({ type: [UserAuditEntryDto] })
  auditTrail!: UserAuditEntryDto[];
}
