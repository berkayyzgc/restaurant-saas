import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsInt()
  categoryId!: number;

  @IsInt()
  restaurantId!: number;
}