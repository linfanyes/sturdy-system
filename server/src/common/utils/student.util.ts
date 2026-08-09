import { Repository } from 'typeorm'
import { Student } from '../../students/student.entity'

/**
 * 按学号查询学生用于家长登录：学号跨学校可能重复（历史残留），优先返回已开启家长登录的记录。
 *
 * 抽取自 AuthService / WechatAuthService / ParentAuthService 的重复逻辑（A05）。
 */
export async function findStudentByNoForLogin(
  studentRepo: Repository<Student>,
  studentNo: string,
): Promise<Student | null> {
  const all = await studentRepo.find({ where: { studentNo } })
  if (!all.length) return null
  return all.find((s) => s.parentLoginEnabled) || all[0]
}
