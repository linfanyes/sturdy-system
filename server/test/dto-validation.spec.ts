import { ValidationPipe, BadRequestException } from '@nestjs/common'
import { CreateSchoolAdminDto } from 'src/admin/dto/school-admin.dto'
import { CreateSchoolDto, UpdateSchoolDto } from 'src/admin/dto/create-school.dto'
import { ParentLoginDto, ChangePasswordDto } from 'src/parent-auth/dto/parent-auth.dto'
import {
  CreateTeacherDto, BatchCreateTeachersDto, CreateClassDto, CreateNoticeDto, UpdateStudentDto,
} from 'src/school-admin/dto/school-admin.dto'

/**
 * DTO 验证层回归测试（对应测试报告「优化建议-1：DTO 验证层」）。
 * 直接驱动与 main.ts 同配置的 ValidationPipe，验证非法入参在管道层被拦截
 * （400 + 中文错误），而非漏到业务层依赖全局异常过滤器兜底。
 */
function makePipe() {
  return new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false })
}

async function expectReject(dto: any, value: any) {
  const pipe = makePipe()
  await expect(
    pipe.transform(value, { type: 'body', metatype: dto, data: undefined } as any),
  ).rejects.toThrow(BadRequestException)
}

describe('DTO 验证层 - ValidationPipe 拦截非法入参', () => {
  it('CreateSchoolAdminDto: 合法入参通过校验', async () => {
    const pipe = makePipe()
    const ok = await pipe.transform(
      { username: 'sa3', password: 'secret1', name: '孙主任', schoolId: 'abc', enabled: true },
      { type: 'body', metatype: CreateSchoolAdminDto, data: undefined } as any,
    )
    expect(ok.username).toBe('sa3')
    expect(ok.enabled).toBe(true)
  })

  it('CreateSchoolAdminDto: 缺用户名/密码/姓名/学校 → 400', async () => {
    await expectReject(CreateSchoolAdminDto, { password: 'secret1', name: 'x', schoolId: 'a' })
    await expectReject(CreateSchoolAdminDto, { username: 'sa', name: 'x', schoolId: 'a' })
    await expectReject(CreateSchoolAdminDto, { username: 'sa', password: 'secret1', schoolId: 'a' })
    await expectReject(CreateSchoolAdminDto, { username: 'sa', password: 'secret1', name: 'x' })
  })

  it('CreateSchoolAdminDto: 密码过短 / 姓名超长 → 400', async () => {
    await expectReject(CreateSchoolAdminDto, { username: 'sa', password: '123', name: 'x', schoolId: 'a' })
    await expectReject(CreateSchoolAdminDto, { username: 'sa', password: 'secret1', name: 'x'.repeat(60), schoolId: 'a' })
  })

  it('CreateSchoolAdminDto: enabled 非布尔 → 400', async () => {
    await expectReject(CreateSchoolAdminDto, { username: 'sa', password: 'secret1', name: 'x', schoolId: 'a', enabled: 'yes' })
  })

  it('CreateSchoolDto: 缺学校名称 → 400；status 非法 → 400', async () => {
    await expectReject(CreateSchoolDto, { prefix: 'SCH' })
    await expectReject(CreateSchoolDto, { name: '测试小学', status: 'weird' })
  })

  it('UpdateSchoolDto: 全可空，合法空对象通过', async () => {
    const pipe = makePipe()
    const ok = await pipe.transform({}, { type: 'body', metatype: UpdateSchoolDto, data: undefined } as any)
    expect(ok).toEqual({})
  })

  it('ParentLoginDto: 缺学号/密码 → 400', async () => {
    await expectReject(ParentLoginDto, { password: '123456' })
    await expectReject(ParentLoginDto, { studentNo: '2024001' })
  })

  it('ChangePasswordDto: 新密码过短 → 400', async () => {
    await expectReject(ChangePasswordDto, { oldPassword: '123456', newPassword: '1' })
  })

  it('BatchCreateTeachersDto: 空数组 / 子项缺姓名 → 400', async () => {
    await expectReject(BatchCreateTeachersDto, { teachers: [] })
    await expectReject(BatchCreateTeachersDto, { teachers: [{ name: '', subject: '语文' }] })
  })

  it('CreateClassDto: 缺班级名/年级/班主任 → 400', async () => {
    await expectReject(CreateClassDto, { grade: '一年级', classNo: '1', headTeacher: '王老师', headTeacherId: 't1' })
    await expectReject(CreateClassDto, { name: '一班', classNo: '1', headTeacher: '王老师', headTeacherId: 't1' })
  })

  it('CreateNoticeDto: 缺标题 → 400', async () => {
    await expectReject(CreateNoticeDto, { content: '内容' })
  })

  it('UpdateStudentDto: 全可空，合法空对象通过', async () => {
    const pipe = makePipe()
    const ok = await pipe.transform({}, { type: 'body', metatype: UpdateStudentDto, data: undefined } as any)
    expect(ok).toEqual({})
  })
})
