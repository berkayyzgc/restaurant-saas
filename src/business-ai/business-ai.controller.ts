import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BusinessAiService } from './business-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAiChatDto } from './dto/business-ai-chat.dto';

@Controller('business-ai')
export class BusinessAiController {
  constructor(
    private readonly businessAiService: BusinessAiService,
  ) {}

  @Post('chat')
@UseGuards(JwtAuthGuard)
chat(
  @Body() businessAiChatDto: BusinessAiChatDto,
  @Req() req,
) {
  return this.businessAiService.chat(
    businessAiChatDto.message,
    businessAiChatDto.restaurantId,
    req.user.sub,
  );
}
}