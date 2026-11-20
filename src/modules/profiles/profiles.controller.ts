import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { ProfileResponseDto } from './dto/profile-response.dto.js';
import { ProfilesService } from './profiles.service.js';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @OptionalAuth()
  @Get(':username')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile by username (optional auth)' })
  @ApiParam({ name: 'username', description: 'Target username' })
  @ApiOkResponse({
    description: 'Profile returned successfully',
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired or revoked access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async getProfile(
    @Param('username') username: string,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    return this.profilesService.getProfile(username, currentUserId);
  }

  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user by username (idempotent)' })
  @ApiParam({ name: 'username', description: 'Target username to follow' })
  @ApiOkResponse({
    description: 'User followed successfully',
    type: ProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Cannot follow yourself',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async followUser(
    @Param('username') username: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.profilesService.followUser(username, currentUserId);
  }

  @Delete(':username/follow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user by username (idempotent)' })
  @ApiParam({ name: 'username', description: 'Target username to unfollow' })
  @ApiOkResponse({
    description: 'User unfollowed successfully',
    type: ProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Cannot unfollow yourself',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async unfollowUser(
    @Param('username') username: string,
    @CurrentUser('userId') currentUserId: string,
  ) {
    return this.profilesService.unfollowUser(username, currentUserId);
  }
}
