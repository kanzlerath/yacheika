import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { UserEntity } from './user.entity';
import { VenueEntity } from './venue.entity';

@Entity('reactions')
@Unique(['userId', 'venueId', 'type', 'vibeTag'])
export class ReactionEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  venueId: string;

  @ManyToOne(() => VenueEntity, (venue) => venue.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue: VenueEntity;

  @Column()
  type: 'like' | 'not_my_place' | 'vibe_tag';

  @Column({ nullable: true })
  vibeTag: string;

  @CreateDateColumn()
  createdAt: Date;
}
