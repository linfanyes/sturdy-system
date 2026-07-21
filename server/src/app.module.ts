import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'

import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ConfigModule as PlatformConfigModule } from './config/config.module'
import { AiModule } from './ai/ai.module'

import { ClassesModule } from './classes/classes.module'
import { StudentsModule } from './students/students.module'
import { SeatsModule } from './seats/seats.module'
import { ExamsModule } from './exams/exams.module'
import { GradesModule } from './grades/grades.module'
import { ParentContactModule } from './parent-contact/parent-contact.module'
import { GeneratedModule } from './generated/generated.module'
import { DutyRosterModule } from './duty-roster/duty-roster.module'
import { SchoolModule } from './school/school.module'
import { ClassOpsModule } from './class-ops/class-ops.module'
import { GrowthModule } from './growth/growth.module'
import { NotesModule } from './notes/notes.module'
import { AwardModule } from './award/award.module'
import { TeacherModule } from './teacher/teacher.module'
import { AdminModule } from './admin/admin.module'
import { EngagementModule } from './engagement/engagement.module'
import { GalleryModule } from './gallery/gallery.module'
import { BackupModule } from './backup/backup.module'
import { LessonObservationModule } from './lesson-observation/lesson-observation.module'
import { WorkLogModule } from './work-log/work-log.module'
import { ReadingLogModule } from './reading-log/reading-log.module'
import { CheckinModule } from './checkin/checkin.module'
import { HomeVisitModule } from './home-visit/home-visit.module'
import { MyGalleryModule } from './my-gallery/my-gallery.module'
import { SemesterModule } from './semester/semester.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => {
        const useSsl = c.get('DB_SSL') === 'true'
        return {
          type: 'mysql',
          host: c.get('DB_HOST'),
          port: +(c.get('DB_PORT') || 3306),
          username: c.get('DB_USERNAME'),
          password: c.get('DB_PASSWORD'),
          database: c.get('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: c.get('DB_SYNCHRONIZE') === 'true',
          charset: 'utf8mb4',
          // 中国时区，避免容器默认 UTC 导致日期字段偏移 8 小时
          timezone: '+08:00',
          // 连不上时短重试后直接报错，避免真机一直等到 102002 网关超时
          retryAttempts: 3,
          retryDelay: 3000,
          // 公网连接腾讯云数据库时可开启 SSL（内网/VPC 一般无需）
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
          extra: {
            connectionLimit: 10,
            // 初始 TCP/TLS 握手 5 秒不成就放弃，避免挂死
            connectTimeout: 5000,
          },
        }
      },
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get('JWT_SECRET'),
        signOptions: { expiresIn: c.get('JWT_EXPIRES_IN') || '30d' },
      }),
    }),
    AuthModule,
    UsersModule,
    PlatformConfigModule,
    AiModule,
    ClassesModule,
    StudentsModule,
    SeatsModule,
    ExamsModule,
    GradesModule,
    ParentContactModule,
    GeneratedModule,
    DutyRosterModule,
    SchoolModule,
    ClassOpsModule,
    GrowthModule,
    NotesModule,
    AwardModule,
    TeacherModule,
    AdminModule,
    EngagementModule,
    GalleryModule,
    BackupModule,
    LessonObservationModule,
    WorkLogModule,
    ReadingLogModule,
    CheckinModule,
    HomeVisitModule,
    MyGalleryModule,
    SemesterModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
