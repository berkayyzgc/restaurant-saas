import { IsEnum, IsInt } from 'class-validator';
import { ServiceRequestType } from '@prisma/client';

export class CreateServiceRequestDto {
  @IsInt()
  tableId!: number;

  @IsEnum(ServiceRequestType)
  type!: ServiceRequestType;
}