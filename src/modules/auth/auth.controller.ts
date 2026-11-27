import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { I18nContext } from 'nestjs-i18n';
import type { CookieOptions, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
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
import { parseDurationToSeconds } from '../../common/utils/duration.util.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { REFRESH_TOKEN_COOKIE } from './auth.constants.js';
import type { ActiveUserData } from './interfaces/jwt-payload.interface.js';

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
    summary:
      'Authenticate user, return Access token, and set HttpOnly Refresh token cookie',
  })
  @ApiOkResponse({
    description: 'Login successful, returns access token',
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
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token using HttpOnly refresh token cookie',
  })
  @ApiOkResponse({
    description: 'Access token refreshed successfully',
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
    if (!user.refreshToken) {
      throw new UnauthorizedException(
        I18nContext.current<I18nTranslations>()?.t(
          'auth.REFRESH_TOKEN_MISSING',
        ) ?? 'Refresh token is missing',
      );
    }
    const tokens = await this.authService.refreshTokens(
      user.userId,
      user.refreshToken,
    );
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
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
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.getRefreshTokenCookieOptions());
    return result;
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const maxAgeMs = parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000;
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.getRefreshTokenCookieOptions(),
      maxAge: maxAgeMs,
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
