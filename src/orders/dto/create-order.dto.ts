import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  menuItemId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  tableId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}