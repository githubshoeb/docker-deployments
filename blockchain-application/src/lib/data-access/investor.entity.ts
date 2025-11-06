import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { OfferEntity } from './offer.entity';

@Entity('investor')
export class InvestorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'id_investor', unique: true })
  id_investor: string;

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

  @ManyToMany(() => OfferEntity, (offer) => offer.investors)
  @JoinTable({
    name: 'offer_investor',
    joinColumn: {
      name: 'investorId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'offerId',
      referencedColumnName: 'id',
    },
  })
  offers?: OfferEntity[];
}

@Entity('offer_investor', {
  synchronize: false,
})
export class OfferInvestorEntity {
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
