import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ReactionEntity } from './reaction.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ unique: true })
  telegramId: string;

  @Column({ unique: true })
  username: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ReactionEntity, (reaction) => reaction.user)
  reactions: ReactionEntity[];
}
