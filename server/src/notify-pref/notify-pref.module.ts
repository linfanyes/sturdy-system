import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotifyPref } from './notify-pref.entity'
import { NotifyPrefService } from './notify-pref.service'
import { TeacherNotifyPrefController, ParentNotifyPrefController } from './notify-pref.controller'

@Module({
  imports: [TypeOrmModule.forFeature([NotifyPref])],
  controllers: [TeacherNotifyPrefController, ParentNotifyPrefController],
  providers: [NotifyPrefService],
  exports: [NotifyPrefService],
})
export class NotifyPrefModule {}
