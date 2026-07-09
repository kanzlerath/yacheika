import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { ReactionEntity } from './reaction.entity';

@Entity('users')
@Index(['provider', 'providerUserId'], { unique: true, where: '"providerUserId" IS NOT NULL' })
export class UserEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ default: 'telegram' })
  provider: 'telegram' | 'yandex';

  @Column({ nullable: true })
  providerUserId: string | null;

  @Column({ unique: true, nullable: true })
  telegramId: string | null;

  @Column({ unique: true })
  username: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  email: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  preferences: {
    clusterMaxZoom?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ReactionEntity, (reaction) => reaction.user)
  reactions: ReactionEntity[];
}
