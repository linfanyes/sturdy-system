import 'reflect-metadata'
import { ForbiddenException } from '@nestjs/common'

/**
 * ClassesService 老师端建班禁用测试。
 *
 * 由于 ClassesService 未从模块导出，这里读取源文件验证 create 方法被改为
 * 抛 ForbiddenException（班主任身份必须由校管指定）。
 */
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(
  path.resolve(__dirname, '../src/classes/classes.module.ts'),
  'utf8',
)

describe('ClassesService 老师端建班禁用', () => {
  it('create 方法直接抛 ForbiddenException，不再调用 super.create', () => {
    // 提取 create 方法体
    const m = src.match(/async create\(teacherId: string, dto: any\)[^{]*\{([\s\S]*?)\n  \}/)
    expect(m).not.toBeNull()
    const body = m![1]
    // 抛出 ForbiddenException
    expect(body).toMatch(/throw new ForbiddenException/)
    // 不再调用 super.create（避免老师自建班自动当 head）
    expect(body).not.toMatch(/super\.create/)
    // 不再写入 class_members head 记录（班主任身份由校管 createClass 写入）
    expect(body).not.toMatch(/addHeadTeacher/)
  })

  it('错误消息明确引导联系校管', () => {
    expect(src).toMatch(/班级需由学校管理员创建并指定班主任/)
  })

  it('ForbiddenException 已在 imports 中', () => {
    expect(src).toMatch(/ForbiddenException/)
  })
})

describe('ClassesService 班主任特权保留', () => {
  it('update 仍校验 assertHeadTeacher（仅班主任可编辑）', () => {
    const m = src.match(/async update\(id: string, teacherId: string, dto: any\)\s*\{([\s\S]*?)\n  \}/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/assertHeadTeacher/)
  })

  it('remove 仍校验 assertHeadTeacher（仅班主任可删除）', () => {
    const m = src.match(/async remove\(id: string, teacherId: string\)\s*\{([\s\S]*?)\n  \}/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/assertHeadTeacher/)
  })

  it('addSubjectTeacher 仍校验 assertHeadTeacher', () => {
    const m = src.match(/async addSubjectTeacher[\s\S]*?\{([\s\S]*?)\n  \}/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/assertHeadTeacher/)
  })

  it('removeSubjectTeacher 仍校验 assertHeadTeacher 且禁止移除 head', () => {
    const m = src.match(/async removeSubjectTeacher[\s\S]*?\{([\s\S]*?)\n  \}/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/assertHeadTeacher/)
    expect(m![1]).toMatch(/不能移除班主任/)
  })
})
