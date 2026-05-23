import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

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

  @Column({ type: 'text', array: true, default: '{}' })
  venueIds: string[];

  @CreateDateColumn()
  publishedAt: Date;
}
