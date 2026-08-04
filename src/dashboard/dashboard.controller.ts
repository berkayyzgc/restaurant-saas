import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary(4);
  }

  @Get('reports')
  getReports(
    @Query('period') period = 'today',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getReports(
      period,
      startDate,
      endDate,
      4,
    );
  }

  @Get('comparison')
  getComparison() {
    return this.dashboardService.getComparisonReport(4);
  }
}