import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('bulk-import')
  @UseGuards(JwtAuthGuard)
  async bulkImport(@Body() body: { students: any[]; defaultPassword: string }) {
    return this.usersService.bulkImport(body.students, body.defaultPassword);
  }
}
