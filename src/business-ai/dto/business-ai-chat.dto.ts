import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class BusinessAiChatDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId!: number;
}