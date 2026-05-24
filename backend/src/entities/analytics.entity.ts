import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics')
export class AnalyticsEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventType: string;

  @Column({ nullable: true })
  venueId: string;

  @Column({ nullable: true })
  userId: string;

  @Index()
  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
