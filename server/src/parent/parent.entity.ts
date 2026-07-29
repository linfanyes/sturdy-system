import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('parents')
export class Parent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true, nullable: true })
  openId: string          // 微信 openid（唯一→一个微信=一个家长身份）

  @Column({ nullable: true })
  phone: string

  @Column({ default: '家长' })
  parentName: string

  @Column({ nullable: true })
  nickName: string

  @Column({ nullable: true })
  relation: string        // 父亲/母亲/监护人

  @Column({ nullable: true })
  passwordHash: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
