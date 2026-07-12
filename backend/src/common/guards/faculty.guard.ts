import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class FacultyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const role = req.user?.role;
    if (role !== 'faculty' && role !== 'admin') {
      throw new ForbiddenException('Access restricted to faculty and administrators');
    }
    return true;
  }
}
