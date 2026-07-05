import { IsInt, IsString } from 'class-validator';

export class CreateMenuCategoryDto {
  @IsString()
  name!: string;

  @IsInt()
  restaurantId!: number;
}