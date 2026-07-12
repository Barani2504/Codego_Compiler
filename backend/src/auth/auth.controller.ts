import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { regNumber: string; password: string }) {
    return this.authService.login(body.regNumber, body.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    await this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
    return { message: 'Password changed successfully' };
  }
}
