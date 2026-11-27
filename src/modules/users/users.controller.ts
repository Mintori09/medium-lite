import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { I18nContext } from 'nestjs-i18n';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { env } from '../../common/configs/env.config.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto.js';
import {
  isAllowedAvatarMimeType,
  type UploadedAvatarFile,
} from '../attachments/attachments.constants.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: env.MAX_AVATAR_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedAvatarMimeType(file.mimetype)) {
          cb(
            new BadRequestException(
              I18nContext.current()?.t('attachments.INVALID_FILE_TYPE') ??
                'attachments.INVALID_FILE_TYPE',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        username: { type: 'string', example: 'john_doe' },
        currentPassword: {
          type: 'string',
          minLength: 1,
          example: 'OldStrongPass123!',
        },
        password: { type: 'string', minLength: 12, example: 'NewStrongPass123!' },
        bio: { type: 'string', nullable: true, example: 'Software Engineer' },
        image: {
          type: 'string',
          nullable: true,
          example: 'https://example.com/avatar.png',
        },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Update current authenticated user and/or avatar' })
  @ApiOkResponse({
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid avatar file',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email or username already exists',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Avatar file size exceeds limit',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @UploadedFile() avatar?: UploadedAvatarFile,
  ) {
    return this.usersService.updateUser(userId, dto, avatar);
  }
}
