import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import { env } from './src/common/configs/env.config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/common/database/contract.ts',
    db: {
      connection: env.DATABASE_URL,
    },
  }),
});
