import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/hello (GET default)', () => {
    return request(app.getHttpServer()).get('/hello').expect(200).expect({
      message: 'Hello World!',
      lang: 'en',
    });
  });

  it('/hello?lang=vi (GET Vietnamese)', () => {
    return request(app.getHttpServer())
      .get('/hello?lang=vi')
      .expect(200)
      .expect({
        message: 'Xin chào thế giới!',
        lang: 'vi',
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
