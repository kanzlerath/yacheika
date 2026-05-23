import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VenueEntity } from './venue.entity';

@Entity('events')
export class EventEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  venueId: string;

  @ManyToOne(() => VenueEntity, (venue) => venue.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue: VenueEntity;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  date: string; // YYYY-MM-DD

  @Column()
  time: string; // HH:MM

  @Column({ nullable: true })
  coverImage: string;
}
