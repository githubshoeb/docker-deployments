import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { OfferEntity } from './offer.entity';

@Entity('sponsor')
export class SponsorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'id_sponsor', unique: true })
  id_sponsor: string;

  @Column({ name: 'public_key', unique: true })
  public_key: string;

  @Column({ name: 'key_id', unique: true })
  key_id: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'date_creation',
  })
  date_creation: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'date_update',
  })
  date_update: Date;

  @ManyToMany(() => OfferEntity, (offer) => offer.sponsors)
  @JoinTable({
    name: 'offer_sponsor',
    joinColumn: {
      name: 'sponsorId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'offerId',
      referencedColumnName: 'id',
    },
  })
  offers?: OfferEntity[];
}

@Entity('offer_sponsor', {
  synchronize: false,
})
export class OfferSponsorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'date_creation',
  })
  date_creation: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'date_update',
  })
  date_update: Date;
}
