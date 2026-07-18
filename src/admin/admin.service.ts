import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  getOverview() {
    return {
      message: 'Super Admin sistemi çalışıyor.',
    };
  }
}