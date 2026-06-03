import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ReactionEntity } from './reaction.entity';
import { EventEntity } from './event.entity';

@Entity('venues')
export class VenueEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  category: string;

  @Column({ type: 'text' })
  shortDescription: string;

  @Column({ type: 'text' })
  fullDescription: string;

  @Column()
  address: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column()
  workingHours: string;

  @Column({ type: 'jsonb', nullable: true })
  workingHoursSchedule: {
    mon?: Array<{ from: string; to: string }>;
    tue?: Array<{ from: string; to: string }>;
    wed?: Array<{ from: string; to: string }>;
    thu?: Array<{ from: string; to: string }>;
    fri?: Array<{ from: string; to: string }>;
    sat?: Array<{ from: string; to: string }>;
    sun?: Array<{ from: string; to: string }>;
    note?: string;
  };

  @Column({ type: 'jsonb' })
  contacts: {
    phone?: string;
    telegram?: string;
    instagram?: string;
    vk?: string;
    website?: string;
  };

  @Column({ type: 'text', array: true, default: '{}' })
  gallery: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'varchar', default: 'published' })
  status: string;

  @Column({ type: 'jsonb' })
  premiumConfig: {
    premiumActive: boolean;
    premiumTheme?: string;
    customColors?: {
      primary: string;
      accent: string;
      glowColor: string;
    };
    heroImage?: string;
    moodBlock?: string;
    featuredDrinks?: string[];
    topItems?: string[];
    ctaUrl?: string;
    ctaText?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ReactionEntity, (reaction) => reaction.venue)
  reactions: ReactionEntity[];

  @OneToMany(() => EventEntity, (event) => event.venue)
  events: EventEntity[];
}
