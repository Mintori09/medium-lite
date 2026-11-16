import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import {
  AuthTokensDto,
  CurrentUserResponseDto,
  LoginDto,
  MessageResponseDto,
  RegisterDto,
} from './dto/index.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto.js';
import { env } from '../../common/configs/env.config.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard.js';
import type { ActiveUserData } from './interfaces/jwt-payload.interface.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (e.g. invalid email, short password)',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email or username already registered',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user and return Access/Refresh tokens',
  })
  @ApiOkResponse({
    description: 'Login successful, returns tokens',
    type: AuthTokensDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or account disabled',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded (5 requests per minute)',
    type: ErrorResponseDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    type: AuthTokensDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, expired or revoked refresh token',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async refresh(
    @CurrentUser() user: ActiveUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      user.userId,
      user.refreshToken!,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary: 'Logout user and invalidate tokens',
  })
  @ApiOkResponse({
    description: 'Logout successful, tokens invalidated',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired or blacklisted access token',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async logout(
    @CurrentUser() user: ActiveUserData,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
    return result;
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile',
  })
  @ApiOkResponse({
    description: 'User profile returned successfully',
    type: CurrentUserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found in system',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async getCurrentUser(@CurrentUser('userId') userId: string) {
    return this.authService.getCurrentUser(userId);
  }
}
