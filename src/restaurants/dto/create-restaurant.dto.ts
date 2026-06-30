import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Wander Heaven' })
@IsString()
@IsNotEmpty()
name!: string;

@ApiProperty({ example: 'Bodrum' })
@IsString()
@IsNotEmpty()
city!: string;

@ApiProperty({ example: 'Gümüşlük Mah. 45' })
@IsString()
@IsNotEmpty()
address!: string;

@ApiProperty({ example: '05321234567' })
@IsString()
@IsNotEmpty()
phone!: string;

@ApiPropertyOptional({ example: 'Deniz manzaralı restoran' })
@IsOptional()
@IsString()
description?: string;}