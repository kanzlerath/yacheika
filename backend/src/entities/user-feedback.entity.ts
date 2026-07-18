import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type UserFeedbackKind = 'idea' | 'bug' | 'other';
export type UserFeedbackStatus = 'new' | 'reviewed' | 'closed';

@Entity('user_feedback')
export class UserFeedbackEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  kind: UserFeedbackKind;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', nullable: true })
  contact?: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  userName?: string;

  @Column({ type: 'varchar', default: 'new' })
  status: UserFeedbackStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
