import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'

import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ConfigModule as PlatformConfigModule } from './config/config.module'
import { AiModule } from './ai/ai.module'

import { ClassesModule } from './classes/classes.module'
import { ClassMembersModule } from './class-members/class-members.module'
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
import { SecurityModule } from './security/security.module'
import { ImModule } from './im/im.module'
import { ParentAuthModule } from './parent-auth/parent-auth.module'
import { SchoolAdminModule } from './school-admin/school-admin.module'
import { StudentInfoUpdateModule } from './student-info-update/student-info-update.module'
import { StudentParentModule } from './student-parent/student-parent.module'
import { AuditModule } from './audit/audit.module'
import { NotificationModule } from './notification/notification.module'
import { MessagesModule } from './messages/messages.module'
import { TeachingCalendarModule } from './teaching-calendar/teaching-calendar.module'
import { TextbookModule } from './textbook/textbook.module'
import { ResourceLibraryModule } from './resource-library/resource-library.module'
import { FeatureModule } from './common/feature/feature.module'
import { EvaluationModule } from './evaluation/evaluation.module'
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
            // 供启动时 migration runner 执行多语句 SQL（业务层仍用参数化查询，无注入风险）
            multipleStatements: true,
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
    // 全局速率限制：兜底 60 次/分钟/IP，防止 AI/文件解析等高成本接口被滥用（DoS/费用滥用）。
    // 具体接口可用 @Throttle(limit, ttl) 覆盖更严格配额（如 AI 接口）。
    // 参数可经 THROTTLE_TTL / THROTTLE_LIMIT 调整（默认 60000ms / 60 次）。
    // ⚠️ 已知限制（历史债 #6）：存储为进程内存，云托管横向扩容后配额按实例数倍增；
    // 如需严格全局配额，需外置 Redis 存储（@nestjs/throttler-storage-redis）——待基础设施就绪后接入。
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => [
        {
          ttl: +(c.get('THROTTLE_TTL') || 60000),
          limit: +(c.get('THROTTLE_LIMIT') || 60),
        },
      ],
    }),
    AuthModule,
    UsersModule,
    PlatformConfigModule,
    AiModule,
    ClassesModule,
    ClassMembersModule,
    StudentsModule,
    SeatsModule,
    ExamsModule,
    GradesModule,
    ParentContactModule,
    ParentAuthModule,
    SchoolAdminModule,
    StudentInfoUpdateModule,
    StudentParentModule,
    AuditModule,
    NotificationModule,
    MessagesModule,
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
    EvaluationModule,
    GalleryModule,
    BackupModule,
    LessonObservationModule,
    WorkLogModule,
    ReadingLogModule,
    CheckinModule,
    HomeVisitModule,
    MyGalleryModule,
    SemesterModule,
    SecurityModule,
    ImModule,
    TeachingCalendarModule,
    TextbookModule,
    ResourceLibraryModule,
    FeatureModule,
  ],
  providers: [
    // 全局限流守卫（默认 60/min/IP，可在具体路由用 @Throttle 覆盖）
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [HealthController],
})
export class AppModule {}
