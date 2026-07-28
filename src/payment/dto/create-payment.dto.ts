import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentItemDto {
  @IsInt()
  orderItemId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreatePaymentDto {
  @IsInt()
  tableSessionId!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentItemDto)
  items!: CreatePaymentItemDto[];

  @IsOptional()
  @IsBoolean()
  keepSessionOpen?: boolean;
}