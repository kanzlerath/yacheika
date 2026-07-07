import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminDataService } from './admin-data.service';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminDataController {
  constructor(private readonly adminDataService: AdminDataService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminDataService.getDashboard();
  }

  @Get('users')
  async getUsers() {
    return this.adminDataService.getUsers();
  }

  @Get('venues/:id/audit')
  async getVenueAudit(@Param('id') id: string) {
    return this.adminDataService.getVenueAudit(id);
  }
}
