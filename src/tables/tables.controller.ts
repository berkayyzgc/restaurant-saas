import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesService } from './tables.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email: string;
    restaurantId: number;
  };
};

@Controller('tables')
export class TablesController {
  constructor(
    private readonly tablesService: TablesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createTableDto: CreateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.create(
      createTableDto,
      request.user.restaurantId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.findAll(
      request.user.restaurantId,
    );
  }

  /*
   * Müşteri QR kodunu giriş yapmadan kullanacağı için
   * bu endpoint açık kalıyor.
   */
  @Get('qr/:token')
  findByQrToken(
    @Param('token') token: string,
  ) {
    return this.tablesService.findByQrToken(token);
  }

  @Patch('qr/:token/close-session')
closeSessionByQrToken(
  @Param('token') token: string,
) {
  return this.tablesService.closeSessionByQrToken(token);
}

  @Patch(':id/close-session')
  @UseGuards(JwtAuthGuard)
  closeSession(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.closeSession(
      +id,
      request.user.restaurantId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.findOne(
      +id,
      request.user.restaurantId,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.update(
      +id,
      updateTableDto,
      request.user.restaurantId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tablesService.remove(
      +id,
      request.user.restaurantId,
    );
  }
}