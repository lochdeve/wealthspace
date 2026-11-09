import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ENV_TOKEN } from '../config/env';
import type { AppEnv } from '../config/env';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  type RequestUser,
} from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register',
    description:
      'Creates a user, their PERSONAL space, and an ACTIVE OWNER membership in one transaction.',
  })
  @ApiCreatedResponse({
    description: 'User created',
    type: RegisterResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already in use',
    schema: {
      example: {
        statusCode: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered',
      },
    },
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Verifies credentials and sets an HttpOnly session cookie (JWT).',
  })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({
    schema: {
      example: {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    },
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserProfileDto> {
    const profile = await this.authService.login(dto);
    const token = this.authService.signAccessToken(profile.id);
    res.cookie(this.env.jwtCookieName, token, {
      httpOnly: true,
      secure: this.env.cookieSecure,
      sameSite: 'lax',
      maxAge: this.env.jwtCookieMaxAgeMs,
      path: '/',
    });
    return profile;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout',
    description: 'Clears the session cookie.',
  })
  @ApiNoContentResponse({ description: 'Session cleared' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(this.env.jwtCookieName, {
      httpOnly: true,
      secure: this.env.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Current user profile',
    description: 'Requires a valid session cookie from login.',
  })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  async me(@CurrentUser() user: RequestUser): Promise<UserProfileDto> {
    return this.authService.getProfileById(user.userId);
  }
}
