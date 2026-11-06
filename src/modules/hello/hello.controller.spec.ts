import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { HelloController } from './hello.controller.js';
import { HelloService } from './hello.service.js';

describe('HelloController', () => {
  let helloController: HelloController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HelloController],
      providers: [
        HelloService,
        {
          provide: I18nService,
          useValue: {
            t: (_key: string, options?: { lang?: string }) => {
              if (options?.lang === 'vi') return 'Xin chào thế giới!';
              return 'Hello World!';
            },
          },
        },
      ],
    }).compile();

    helloController = app.get<HelloController>(HelloController);
  });

  describe('root and hello', () => {
    it('should return default English hello message', () => {
      expect(helloController.getHello(undefined as any)).toEqual({
        message: 'Hello World!',
        lang: 'en',
      });
    });
  });
});
