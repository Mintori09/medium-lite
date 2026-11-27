import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ActiveUserData } from '../../modules/auth/interfaces/jwt-payload.interface.js';

export const CurrentUser = createParamDecorator(
  (data: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ActiveUserData;

    return data ? user?.[data] : user;
  },
);
