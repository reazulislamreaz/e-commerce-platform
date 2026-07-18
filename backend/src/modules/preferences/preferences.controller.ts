import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { PreferencesResponseDto } from './dto/preferences-response.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesService } from './preferences.service';

@ApiTags('Preferences')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('users/me/preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Creates default preferences on first access.',
  })
  @ApiOkResponse({ type: PreferencesResponseDto })
  getMine(@CurrentUser() actor: JwtPayload) {
    return this.preferences.getMine(actor.sub);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Toggling email marketing records a consent grant or withdrawal.',
  })
  @ApiOkResponse({ type: PreferencesResponseDto })
  updateMine(@CurrentUser() actor: JwtPayload, @Body() dto: UpdatePreferencesDto) {
    return this.preferences.updateMine(actor.sub, dto);
  }
}
