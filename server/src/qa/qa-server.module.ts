/**
 * QA 测试专用模块（仅用于本地自动化测试，不用于生产）
 * - 数据库：better-sqlite3 内存库（无需 MySQL）
 * - 限流：放宽到 100000/分钟，避免性能测试误触 429
 * - 导入与 AppModule 完全一致的业务模块，保证 API 面一致
 */
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'

import { AuthModule } from '../auth/auth.module'
import { JwtAuthModule } from '../common/guards/jwt-auth.module'
import { UsersModule } from '../users/users.module'
import { ConfigModule as PlatformConfigModule } from '../config/config.module'
import { AiModule } from '../ai/ai.module'
import { ClassesModule } from '../classes/classes.module'
import { ClassMembersModule } from '../class-members/class-members.module'
import { StudentsModule } from '../students/students.module'
import { SeatsModule } from '../seats/seats.module'
import { ExamsModule } from '../exams/exams.module'
import { GradesModule } from '../grades/grades.module'
import { ParentContactModule } from '../parent-contact/parent-contact.module'
import { GeneratedModule } from '../generated/generated.module'
import { DutyRosterModule } from '../duty-roster/duty-roster.module'
import { SchoolModule } from '../school/school.module'
import { ClassOpsModule } from '../class-ops/class-ops.module'
import { GrowthModule } from '../growth/growth.module'
import { NotesModule } from '../notes/notes.module'
import { AwardModule } from '../award/award.module'
import { TeacherModule } from '../teacher/teacher.module'
import { AdminModule } from '../admin/admin.module'
import { EngagementModule } from '../engagement/engagement.module'
import { GalleryModule } from '../gallery/gallery.module'
import { BackupModule } from '../backup/backup.module'
import { LessonObservationModule } from '../lesson-observation/lesson-observation.module'
import { WorkLogModule } from '../work-log/work-log.module'
import { ReadingLogModule } from '../reading-log/reading-log.module'
import { CheckinModule } from '../checkin/checkin.module'
import { HomeVisitModule } from '../home-visit/home-visit.module'
import { MyGalleryModule } from '../my-gallery/my-gallery.module'
import { SemesterModule } from '../semester/semester.module'
import { SecurityModule } from '../security/security.module'
import { ImModule } from '../im/im.module'
import { ParentAuthModule } from '../parent-auth/parent-auth.module'
import { SchoolAdminModule } from '../school-admin/school-admin.module'
import { StudentInfoUpdateModule } from '../student-info-update/student-info-update.module'
import { StudentParentModule } from '../student-parent/student-parent.module'
import { AuditModule } from '../audit/audit.module'
import { NotificationModule } from '../notification/notification.module'
import { MessagesModule } from '../messages/messages.module'
import { TeachingCalendarModule } from '../teaching-calendar/teaching-calendar.module'
import { TextbookModule } from '../textbook/textbook.module'
import { ResourceLibraryModule } from '../resource-library/resource-library.module'
import { FeatureModule } from '../common/feature/feature.module'
import { HealthController } from '../health.controller'
import { OnlineResourcesModule } from '../online-resources/online-resources.module'
import { CacheModule } from '../common/cache/cache.module'
import { EvaluationModule } from '../evaluation/evaluation.module'
import { GameScoresModule } from '../game-scores/game-scores.module'
import { ChatHistoryModule } from '../chat-history/chat-history.module'
import { MonitorModule } from '../monitor/monitor.module'
import { MathMistakesModule } from '../math-mistakes/math-mistakes.module'
import { AnalysisModule } from '../analysis/analysis.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.qa' }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      dropSchema: true,
      autoLoadEntities: true,
      logging: false,
    }),
    JwtModule.register({
      global: true,
      secret: 'qa-test-secret-key-for-local-automation',
      signOptions: { expiresIn: '30d' },
    }),
    // QA 限流放宽：100000 次/分钟，性能测试不误触
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100000 }]),
    JwtAuthModule,
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
    OnlineResourcesModule,
    CacheModule,
    EvaluationModule,
    GameScoresModule,
    ChatHistoryModule,
    MonitorModule,
    MathMistakesModule,
    AnalysisModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [HealthController],
})
export class QaServerModule {}
