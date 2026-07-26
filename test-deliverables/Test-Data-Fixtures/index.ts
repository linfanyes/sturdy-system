// 统一测试数据工厂 - 三端复用
// 用法：import { UserFactory, SchoolFactory, StudentFactory, ... } from '@gardener/test-fixtures'

export type Role = 'super_admin' | 'school_admin' | 'teacher' | 'parent';

export interface UserData {
  id?: number;
  username: string;
  passwordHash?: string;
  name: string;
  role: Role;
  schoolId?: number;
  classId?: number;
  phone?: string;
  email?: string;
  avatar?: string;
  features?: string[];
  enabled?: boolean;
  teacherNo?: string;
}

export interface SchoolData {
  id?: number;
  code: string;
  name: string;
  shortName?: string;
  address?: string;
  contact?: string;
  phone?: string;
  logo?: string;
  status?: 'active' | 'inactive';
  adminId?: number;
}

export interface ClassData {
  id?: number;
  name: string;
  grade: string;
  classNo: number;
  schoolId: number;
  teacherId?: number;
  term?: string;
  studentCount?: number;
}

export interface StudentData {
  id?: number;
  name: string;
  studentNo?: string;
  classId: number;
  schoolId: number;
  gender?: 'male' | 'female';
  birthDate?: string;
  parentName?: string;
  parentPhone?: string;
  parentOpenId?: string;
  avatar?: string;
  seatNo?: number;
  tags?: string[];
}

export interface ExamData {
  id?: number;
  name: string;
  type: 'midterm' | 'final' | 'monthly' | 'mock' | 'custom';
  date: string;
  schoolId: number;
  grades: string[];
  subjects: string[];
  status: 'draft' | 'published' | 'recording' | 'completed' | 'archived';
  teacherId?: number;
}

export interface GradeData {
  id?: number;
  studentId: number;
  studentName: string;
  studentNo?: string;
  classId: number;
  className: string;
  subject: string;
  examId: number;
  examName: string;
  score: number | null;
  isAbsent?: boolean;
  rank?: number;
  classRank?: number;
  gradeRank?: number;
  teacherId: number;
  teacherName: string;
}

export interface HomeworkData {
  id?: number;
  title: string;
  content: string;
  subject: string;
  classId: number;
  className: string;
  grade: string;
  teacherId: number;
  teacherName: string;
  assignDate: string;
  dueDate: string;
  status: 'draft' | 'published' | 'completed' | 'archived';
  attachments?: HomeworkAttachmentData[];
}

export interface HomeworkAttachmentData {
  id?: number;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  size: number;
}

export interface HomeworkSubmissionData {
  id?: number;
  homeworkId: number;
  studentId: number;
  studentName: string;
  content?: string;
  attachments?: HomeworkAttachmentData[];
  submittedAt: string;
  score?: number;
  comment?: string;
  gradedBy?: number;
  gradedByName?: string;
  gradedAt?: string;
}

export interface NoticeData {
  id?: number;
  title: string;
  content: string;
  type: 'notice' | 'announcement' | 'homework' | 'activity' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  publisherId: number;
  publisherName: string;
  publisherRole: Role;
  schoolId?: number;
  targetType: 'all' | 'school' | 'grade' | 'class' | 'student' | 'teacher' | 'parent';
  targetIds?: number[];
  attachments?: NoticeAttachmentData[];
}

export interface NoticeAttachmentData {
  id?: number;
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * 用户/教师/家长/校管/超管工厂
 */
export class UserFactory {
  private static counter = 0;
  
  static createSuperAdmin(overrides: Partial<UserData> = {}): UserData {
    return {
      id: ++this.counter,
      username: `super_${Date.now()}`,
      passwordHash: 'hashed_password',
      name: '超级管理员',
      role: 'super_admin',
      features: ['all'],
      enabled: true,
      avatar: '',
      ...overrides,
    };
  }

  static createSchoolAdmin(schoolId: number, overrides: Partial<UserData> = {}): UserData {
    return {
      id: ++this.counter,
      username: `admin_${Date.now()}`,
      passwordHash: 'hashed_password',
      name: '测试校管',
      role: 'school_admin',
      schoolId,
      features: ['school_manage', 'teacher_manage', 'student_manage', 'class_manage', 'data_analysis'],
      enabled: true,
      avatar: '',
      ...overrides,
    };
  }

  static createTeacher(schoolId: number, overrides: Partial<UserData> = {}): UserData {
    return {
      id: ++this.counter,
      username: `teacher_${Date.now()}`,
      passwordHash: 'hashed_password',
      name: '测试老师',
      role: 'teacher',
      schoolId,
      phone: `138${String(Date.now()).slice(-8)}`,
      features: ['homework', 'grades', 'attendance'],
      enabled: true,
      avatar: '',
      teacherNo: `T${String(Date.now()).slice(-6)}`,
      ...overrides,
    };
  }

  static createParent(studentId: number, schoolId: number, overrides: Partial<UserData> = {}): UserData {
    return {
      id: ++this.counter,
      username: `parent_${Date.now()}`,
      passwordHash: 'hashed_password',
      name: '测试家长',
      role: 'parent',
      schoolId,
      classId: overrides.classId,
      phone: `139${String(Date.now()).slice(-8)}`,
      features: [],
      enabled: true,
      avatar: '',
      ...overrides,
    };
  }

  static createUser(role: Role, schoolId: number, overrides: Partial<UserData> = {}): UserData {
    switch (role) {
      case 'super_admin':
        return this.createSuperAdmin(overrides);
      case 'school_admin':
        return this.createSchoolAdmin(schoolId, overrides);
      case 'teacher':
        return this.createTeacher(schoolId, overrides);
      case 'parent':
        return this.createParent(overrides.studentId || 1, schoolId, overrides);
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }
}

/**
 * 学校工厂
 */
export class SchoolFactory {
  private static counter = 0;
  
  static create(overrides: Partial<SchoolData> = {}): SchoolData {
    return {
      id: ++this.counter,
      code: `SCH${String(Date.now()).slice(-3)}`,
      name: '测试学校',
      shortName: '测试校',
      address: '测试地址',
      contact: '测试联系人',
      phone: '13800138000',
      logo: '',
      status: 'active',
      ...overrides,
    };
  }

  static createMultiple(count: number, baseOverrides: Partial<SchoolData> = {}): SchoolData[] {
    return Array.from({ length: count }, (_, i) => 
      this.create({ code: `SCH${String(i + 1).padStart(3, '0')}`, ...baseOverrides })
    );
  }
}

/**
 * 班级工厂
 */
export class ClassFactory {
  private static counter = 0;
  
  static create(schoolId: number, grade: string, classNo: number, teacherId?: number, overrides: Partial<ClassData> = {}): ClassData {
    const name = `${grade}${classNo}班`;
    return {
      id: ++this.counter,
      name,
      grade,
      classNo,
      schoolId,
      teacherId,
      term: '2024-2025-1',
      studentCount: 0,
      ...overrides,
    };
  }

  static createByGrade(schoolId: number, grade: string, count: number, teacherIds: number[] = [], overrides: Partial<ClassData> = {}): ClassData[] {
    return Array.from({ length: count }, (_, i) => 
      this.create(schoolId, grade, i + 1, teacherIds[i], overrides)
    );
  }

  static createPrimaryClasses(schoolId: number, teacherIds: number[] = []): ClassData[] {
    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
    return grades.flatMap((grade, gi) => 
      Array.from({ length: 3 }, (_, ci) => 
        this.create(schoolId, grade, ci + 1, teacherIds[gi * 3 + ci], { studentCount: 40 + ci * 5 })
      )
    );
  }

  static createJuniorClasses(schoolId: number, teacherIds: number[] = []): ClassData[] {
    const grades = ['初一', '初二', '初三'];
    return grades.flatMap((grade, gi) => 
      Array.from({ length: 4 }, (_, ci) => 
        this.create(schoolId, grade, ci + 1, teacherIds[gi * 4 + ci], { studentCount: 45 + ci * 5 })
      )
    );
  }

  static createSeniorClasses(schoolId: number, teacherIds: number[] = []): ClassData[] {
    const grades = ['高一', '高二', '高三'];
    return grades.flatMap((grade, gi) => 
      Array.from({ length: 5 }, (_, ci) => 
        this.create(schoolId, grade, ci + 1, teacherIds[gi * 5 + ci], { studentCount: 50 + ci * 5 })
      )
    );
  }
}

/**
 * 学生工厂
 */
export class StudentFactory {
  private static counter = 0;
  
  static create(classId: number, schoolId: number, teacherId: number, overrides: Partial<StudentData> = {}): StudentData {
    return {
      id: ++this.counter,
      name: `学生_${Date.now()}_${this.counter}`,
      studentNo: `S${String(Date.now()).slice(-6)}${String(this.counter).padStart(2, '0')}`,
      classId,
      schoolId,
      gender: this.counter % 2 === 0 ? 'male' : 'female',
      birthDate: '2015-01-01',
      parentName: `家长_${this.counter}`,
      parentPhone: `138${String(Date.now()).slice(-8)}`,
      parentOpenId: '',
      avatar: '',
      seatNo: this.counter,
      tags: [],
      ...overrides,
    };
  }

  static createForClass(classId: number, schoolId: number, teacherId: number, count: number, overrides: Partial<StudentData> = {}): StudentData[] {
    return Array.from({ length: count }, (_, i) => 
      this.create(classId, schoolId, teacherId, { 
        seatNo: i + 1,
        name: `学生${i + 1}`,
        studentNo: `S${String(Date.now()).slice(-6)}${String(i + 1).padStart(2, '0')}`,
        ...overrides 
      })
    );
  }

  static createWithParents(classId: number, schoolId: number, teacherId: number, parentPhones: string[], overrides: Partial<StudentData> = {}): StudentData {
    return this.create(classId, schoolId, teacherId, {
      parentPhone: parentPhones[0],
      ...overrides,
    });
  }
}

/**
 * 考试工厂
 */
export class ExamFactory {
  private static counter = 0;
  
  static create(schoolId: number, teacherId: number, overrides: Partial<ExamData> = {}): ExamData {
    return {
      id: ++this.counter,
      name: '期中考试',
      type: 'midterm',
      date: new Date().toISOString().split('T')[0],
      schoolId,
      grades: ['三年级'],
      subjects: ['语文', '数学', '英语'],
      status: 'draft',
      teacherId,
      teacherName: '测试老师',
      ...overrides,
    };
  }

  static createPublished(schoolId: number, teacherId: number, overrides: Partial<ExamData> = {}): ExamData {
    return this.create(schoolId, teacherId, { status: 'published', ...overrides });
  }

  static createCompleted(schoolId: number, teacherId: number, overrides: Partial<ExamData> = {}): ExamData {
    return this.create(schoolId, teacherId, { status: 'completed', ...overrides });
  }
}

/**
 * 成绩工厂
 */
export class GradeFactory {
  private static counter = 0;
  
  static create(examId: number, examName: string, studentId: number, studentName: string, classId: number, className: string, subject: string, teacherId: number, teacherName: string, overrides: Partial<GradeData> = {}): GradeData {
    return {
      id: ++this.counter,
      studentId,
      studentName,
      studentNo: `S${String(Date.now()).slice(-6)}`,
      classId,
      className,
      subject,
      examId,
      examName,
      score: 85 + Math.floor(Math.random() * 30),
      isAbsent: false,
      rank: 0,
      classRank: 0,
      gradeRank: 0,
      teacherId,
      teacherName,
      ...overrides,
    };
  }

  static createBatch(exam: ExamData, students: StudentData[], teacherId: number, teacherName: string): GradeData[] {
    return students.flatMap(student => 
      exam.subjects.map(subject => 
        this.create(exam.id, exam.name, student.id, student.name, student.classId, student.name, subject, teacherId, teacherName)
      )
    );
  }

  static createAbsent(examId: number, examName: string, studentId: number, studentName: string, classId: number, className: string, subject: string, teacherId: number, teacherName: string): GradeData {
    return this.create(examId, examName, studentId, studentName, classId, className, subject, teacherId, teacherName, {
      score: null,
      isAbsent: true,
    });
  }
}

/**
 * 作业工厂
 */
export class HomeworkFactory {
  private static counter = 0;
  
  static create(teacherId: number, classId: number, className: string, grade: string, subject: string, teacherName: string, overrides: Partial<HomeworkData> = {}): HomeworkData {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      id: ++this.counter,
      title: '语文作业',
      content: '完成课本练习第1-3题',
      subject,
      classId,
      className,
      grade,
      teacherId,
      teacherName,
      assignDate: today.toISOString().split('T')[0],
      dueDate: tomorrow.toISOString().split('T')[0],
      status: 'published',
      attachments: [],
      ...overrides,
    };
  }

  static createDraft(teacherId: number, classId: number, className: string, grade: string, subject: string, teacherName: string): HomeworkData {
    return this.create(teacherId, classId, className, grade, subject, teacherName, { status: 'draft' });
  }

  static createScheduled(teacherId: number, classId: number, className: string, grade: string, subject: string, teacherName: string, publishAt: Date): HomeworkData {
    return this.create(teacherId, classId, className, grade, subject, teacherName, { 
      status: 'scheduled',
      assignDate: publishAt.toISOString().split('T')[0],
    });
  }

  static createSubmission(homeworkId: number, studentId: number, studentName: string, overrides: Partial<HomeworkSubmissionData> = {}): HomeworkSubmissionData {
    return {
      id: ++this.counter,
      homeworkId,
      studentId,
      studentName,
      content: '我的作业答案...',
      attachments: [],
      submittedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createGradedSubmission(homeworkId: number, studentId: number, studentName: string, score: number, comment: string, gradedBy: number, gradedByName: string): HomeworkSubmissionData {
    return this.createSubmission(homeworkId, studentId, studentName, {
      score,
      comment,
      gradedBy,
      gradedByName,
      gradedAt: new Date().toISOString(),
    });
  }
}

/**
 * 通知公告工厂
 */
export class NoticeFactory {
  private static counter = 0;
  
  static create(publisherId: number, publisherName: string, publisherRole: Role, overrides: Partial<NoticeData> = {}): NoticeData {
    return {
      id: ++this.counter,
      title: '测试公告',
      content: '公告内容',
      type: 'notice',
      priority: 'normal',
      publisherId,
      publisherName,
      publisherRole,
      targetType: 'class',
      targetIds: [],
      attachments: [],
      readCount: 0,
      totalCount: 0,
      publishedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      ...overrides,
    };
  }

  static createForClass(publisherId: number, publisherName: string, publisherRole: Role, classIds: number[]): NoticeData {
    return this.create(publisherId, publisherName, publisherRole, {
      targetType: 'class',
      targetIds: classIds,
    });
  }

  static createForStudent(publisherId: number, publisherName: string, publisherRole: Role, studentIds: number[]): NoticeData {
    return this.create(publisherId, publisherName, publisherRole, {
      targetType: 'student',
      targetIds: studentIds,
    });
  }
}

/**
 * 统一导出
 */
export const TestFactories = {
  User: UserFactory,
  School: SchoolFactory,
  Class: ClassFactory,
  Student: StudentFactory,
  Exam: ExamFactory,
  Grade: GradeFactory,
  Homework: HomeworkFactory,
  Notice: NoticeFactory,
};

export default TestFactories;