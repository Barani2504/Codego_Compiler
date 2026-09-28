import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import * as os from 'os';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api')
  getApiStatus(): object {
    return {
      message: 'CodeGoAI Backend is up and running!',
      status: 'success',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Load-balancer demo endpoint.
   * Returns the Docker container hostname (api1 / api2 / api3 / api4) and PID
   * so you can visually prove that NGINX is distributing requests across all
   * instances using the least-connections algorithm.
   *
   * Usage (demo script): GET /api/instance
   */
  @SkipThrottle()
  @Get('api/instance')
  getInstance(): object {
    return {
      instance:  os.hostname(),           // Docker sets this to the container name
      pid:       process.pid,
      uptime:    Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Health check endpoint — used by:
   *  - Docker HEALTHCHECK (interval: 15s) to restart crashed containers
   *  - NGINX upstream max_fails to remove dead instances from rotation
   *  - PgBouncer / load balancer liveliness probes
   */
  @SkipThrottle()
  @Get('health')
  health(): object {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
