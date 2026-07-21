import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common'
import { AdminService } from './admin.service'

@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    const token = this.svc.login(body.username || '', body.password || '')
    return { token }
  }

  @Get('users')
  listUsers(@Headers('authorization') auth: string) {
    this.verify(auth)
    return this.svc.listUsers()
  }

  @Delete('users/:id')
  deleteUser(@Headers('authorization') auth: string, @Param('id') id: string) {
    this.verify(auth)
    return this.svc.deleteUser(id)
  }

  @Patch('users/:id/features')
  updateFeatures(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: { features: string[] },
  ) {
    this.verify(auth)
    return this.svc.updateUserFeatures(id, body.features || [])
  }

  private verify(auth: string) {
    const token = (auth || '').replace('Bearer ', '')
    if (!this.svc.verifyAdminToken(token)) {
      throw new UnauthorizedException('管理员身份验证失败')
    }
  }
}
