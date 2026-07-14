import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { ServiceRequestService } from './service-request.service';

@Controller('service-request')
export class ServiceRequestController {
  constructor(
    private readonly serviceRequestService: ServiceRequestService,
  ) {}

  @Post()
  create(
    @Body()
    createServiceRequestDto: CreateServiceRequestDto,
  ) {
    return this.serviceRequestService.create(
      createServiceRequestDto,
    );
  }

  @Get('pending')
  findPending() {
    return this.serviceRequestService.findPending();
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.serviceRequestService.complete(+id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.serviceRequestService.cancel(+id);
  }
}