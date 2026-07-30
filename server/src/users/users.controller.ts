import { Controller, Get, Put, Patch, Body, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

@Roles('teacher')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentTeacher() t: any) {
    return this.users.findById(t.sub)
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentTeacher() t: any, @Body() dto: UpdateProfileDto) {
    return this.users.update(t.sub, dto)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  patchMe(@CurrentTeacher() t: any, @Body() dto: UpdateProfileDto) {
    return this.users.update(t.sub, dto)
  }
}
