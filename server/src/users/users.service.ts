import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByOpenid(openid: string) {
    return this.repo.findOne({ where: { openid } })
  }

  findByUsername(username: string) {
    return this.repo.findOne({ where: { username } })
  }

  findByTeacherNo(teacherNo: string) {
    return this.repo.findOne({ where: { teacherNo } })
  }

  async findById(id: string): Promise<User> {
    const u = await this.repo.findOne({ where: { id } })
    if (!u) throw new NotFoundException('用户不存在')
    return u
  }

  create(dto: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(dto as User))
  }

  async update(id: string, dto: Partial<User>): Promise<User> {
    const u = await this.findById(id)
    Object.assign(u, dto)
    return this.repo.save(u)
  }
}
