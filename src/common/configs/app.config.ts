import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

export function configureApp(app: NestExpressApplication): void {
  app.use(cookieParser());
}
