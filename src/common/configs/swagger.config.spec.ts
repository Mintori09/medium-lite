import { describe, expect, it } from 'vitest';
import { createSwaggerDocumentBuilder } from './swagger.config.js';

describe('Swagger DocumentBuilder Config', () => {
  it('should include global accept-language header parameter for i18n support', () => {
    const config = createSwaggerDocumentBuilder().build();

    expect(config.info.title).toBeDefined();

    // In @nestjs/swagger, global parameters are attached via Symbol.for('swagger/globalParameters')
    const globalParamsKey = Symbol.for('swagger/globalParameters');
    const globalParams = (config as Record<string | symbol, unknown>)[
      globalParamsKey
    ] as Array<{ name: string; in: string }>;

    expect(Array.isArray(globalParams)).toBe(true);
    const acceptLangParam = globalParams.find(
      (p) => p.name === 'accept-language',
    );
    expect(acceptLangParam).toBeDefined();
    expect(acceptLangParam?.in).toBe('header');
  });
});
