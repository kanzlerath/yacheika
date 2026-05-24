import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { VenueEntity } from './venue.entity';

@Entity('collections')
export class CollectionEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  cover: string;

  @ManyToMany(() => VenueEntity, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'collection_venues',
    joinColumn: { name: 'collectionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'venueId', referencedColumnName: 'id' }
  })
  venues: VenueEntity[];

  @CreateDateColumn()
  publishedAt: Date;
}
