import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
// Import existing feature modules
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { ConfigModule as AppConfigModule } from '../../src/config/config.module';
import { AiModule } from '../../src/ai/ai.module';
import { ClassesModule } from '../../src/classes/classes.module';
import { ClassMembersModule } from '../../src/class-members/class-members.module';
import { StudentsModule } from '../../src/students/students.module';
import { SeatsModule } from '../../src/seats/seats.module';
import { ExamsModule } from '../../src/exams/exams.module';
import { GradesModule } from '../../src/grades/grades.module';
import { ParentContactModule } from '../../src/parent-contact/parent-contact.module';
import { ParentAuthModule } from '../../src/parent-auth/parent-auth.module';
import { SchoolAdminModule } from '../../src/school-admin/school-admin.module';
import { AuditModule } from '../../src/audit/audit.module';
import { NotificationModule } from '../../src/notification/notification.module';
import { GeneratedModule } from '../../src/generated/generated.module';
import { DutyRosterModule } from '../../src/duty-roster/duty-roster.module';
import { SchoolModule } from '../../src/school/school.module';
import { ClassOpsModule } from '../../src/class-ops/class-ops.module';
import { GrowthModule } from '../../src/growth/growth.module';
import { NotesModule } from '../../src/notes/notes.module';
import { AwardModule } from '../../src/award/award.module';
import { TeacherModule } from '../../src/teacher/teacher.module';
import { AdminModule } from '../../src/admin/admin.module';
import { EngagementModule } from '../../src/engagement/engagement.module';
import { GalleryModule } from '../../src/gallery/gallery.module';
import { BackupModule } from '../../src/backup/backup.module';
import { LessonObservationModule } from '../../src/lesson-observation/lesson-observation.module';
import { WorkLogModule } from '../../src/work-log/work-log.module';
import { ReadingLogModule } from '../../src/reading-log/reading-log.module';
import { CheckinModule } from '../../src/checkin/checkin.module';
import { HomeVisitModule } from '../../src/home-visit/home-visit.module';
import { MyGalleryModule } from '../../src/my-gallery/my-gallery.module';
import { SemesterModule } from '../../src/semester/semester.module';
import { SecurityModule } from '../../src/security/security.module';
import { ImModule } from '../../src/im/im.module';
import { TeachingCalendarModule } from '../../src/teaching-calendar/teaching-calendar.module';

import { HealthController } from '../../src/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => {
        // 优先使用环境中的 MySQL（云托管自带 MySQL8）
        const dbHost = c.get('DB_HOST')
        if (dbHost) {
          return {
            type: 'mysql',
            host: dbHost,
            port: +(c.get('DB_PORT') || 3306),
            username: c.get('DB_USERNAME') || 'root',
            password: c.get('DB_PASSWORD') || '',
            database: c.get('DB_DATABASE') || 'gardener',
            synchronize: true,
            dropSchema: false,
            autoLoadEntities: true,
            logging: false,
            charset: 'utf8mb4',
            timezone: '+08:00',
          }
        }
        // 回退：无数据库可用时使用 sqlite 内存库（仅单元测试场景）
        try {
          require.resolve('better-sqlite3')
          return {
            type: 'better-sqlite3' as const,
            database: ':memory:',
            synchronize: true,
            dropSchema: true,
            autoLoadEntities: true,
            logging: false,
          }
        } catch {
          return {
            type: 'better-sqlite3' as const,
            database: ':memory:',
            synchronize: true,
            dropSchema: true,
            autoLoadEntities: true,
            logging: false,
          }
        }
      },
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get('JWT_SECRET') || 'test-secret-key-for-testing',
        signOptions: { expiresIn: c.get('JWT_EXPIRES_IN') || '30d' },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
    AuthModule,
    UsersModule,
    AppConfigModule,
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
    AuditModule,
    NotificationModule,
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [HealthController],
})
export class TestAppModule {}