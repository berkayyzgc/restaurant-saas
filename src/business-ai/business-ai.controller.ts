import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { BusinessAiService } from './business-ai.service';
import { BusinessAiChatDto } from './dto/business-ai-chat.dto';

@Controller('business-ai')
export class BusinessAiController {
  constructor(
    private readonly businessAiService: BusinessAiService,
  ) {}

  @Post('chat')
  chat(
    @Body() businessAiChatDto: BusinessAiChatDto,
  ) {
    return this.businessAiService.chat(
      businessAiChatDto.message,
      businessAiChatDto.restaurantId,
    );
  }
}