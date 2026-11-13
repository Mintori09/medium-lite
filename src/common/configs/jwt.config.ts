import type { JwtModuleOptions } from '@nestjs/jwt';
import { env } from './env.config.js';

export const jwtConfig: JwtModuleOptions = {
  secret: env.JWT_ACCESS_SECRET,
  signOptions: {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  },
};
