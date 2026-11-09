import { Controller, Get } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import { HelloResponseDto } from './dto/hello-response.dto.js';
import { HelloService } from './hello.service.js';

@ApiTags('Hello')
@Controller()
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @ApiOperation({ summary: 'Default Hello World endpoint' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code ("en" or "vi")',
    example: 'en',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Preferred language ("en" or "vi")',
  })
  @ApiResponse({
    status: 200,
    description: 'Greeting response in the requested language',
    type: HelloResponseDto,
  })
  getRoot(@I18n() i18n: I18nContext): HelloResponseDto {
    return this.helloService.getHello(i18n);
  }

  @Get('hello')
  @ApiOperation({ summary: 'Hello World endpoint with i18n support' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code ("en" or "vi")',
    example: 'vi',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Preferred language ("en" or "vi")',
  })
  @ApiResponse({
    status: 200,
    description: 'Greeting response in the requested language',
    type: HelloResponseDto,
  })
  getHello(@I18n() i18n: I18nContext): HelloResponseDto {
    return this.helloService.getHello(i18n);
  }
}
