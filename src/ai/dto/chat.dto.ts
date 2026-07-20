import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ChatDto {
  @ApiProperty({
    example: 'Acılı ve 300 TL altında bir şey önerir misin?',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    example: 4,
    description: 'Öneri alınacak restoranın ID bilgisi',
  })
  @IsInt()
  @Min(1)
  restaurantId!: number;
}