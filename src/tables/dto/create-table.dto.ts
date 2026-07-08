import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({
    example: 'Masa 1',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 4,
  })
  @IsInt()
  restaurantId!: number;
}