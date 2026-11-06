import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
  @ApiProperty({
    description: 'Translated greeting message',
    example: 'Hello World!',
  })
  message: string;

  @ApiProperty({
    description: 'Current language code',
    example: 'en',
  })
  lang: string;
}
