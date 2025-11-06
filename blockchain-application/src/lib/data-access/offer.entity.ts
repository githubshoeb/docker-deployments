import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { SponsorEntity } from './sponsor.entity';
import { InvestorEntity } from './investor.entity';

@Entity('offer')
export class OfferEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'text', name: 'id_offer', unique: true })
  id_offer: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  symbol: string;

  @Column({ type: 'smallint' })
  decimals: number;

  @Column({ type: 'numeric' })
  total_supply: number;

  @Column({ unique: true, name: 'contract_hash' })
  contract_hash: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'date_creation',
  })
  date_creation?: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'date_update',
  })
  date_update?: Date;

  @ManyToMany(() => SponsorEntity, (sponsor) => sponsor.offers)
  sponsors?: SponsorEntity[];

  @ManyToMany(() => InvestorEntity, (investor) => investor.offers)
  investors?: InvestorEntity[];
}
