import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';
import { ProcessIyzicoPaymentDto } from './dto/process-iyzico-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.create(createPaymentDto);
  }

  @Post('iyzico')
processIyzicoPayment(
  @Body() processPaymentDto: ProcessIyzicoPaymentDto,
) {
  return this.paymentService.processIyzicoPayment(
    processPaymentDto,
  );
}

  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
  ) {
    return this.paymentService.complete(+id);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
  ) {
    return this.paymentService.cancel(+id);
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.paymentService.findOne(+id);
  }
}