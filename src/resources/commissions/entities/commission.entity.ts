import { BOOKING_STATUS, COMMISSIONS_STATUS, COMMISSION_ROLE } from "src/global/enums";
import { Address } from "src/resources/address/entities/address.entity";
import { Base } from "src/resources/base.entity";
import { Invoice } from "src/resources/invoice/entities/invoice.entity";
import { Review } from "src/resources/review/entities/review.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Commission extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'percentage',
    type: 'int',
    default: 0
  })
  percentage: number

  @Column({
    name: 'description',
    type: 'text'
  })
  description: string

  @Column({
    name: 'role',
    type: 'enum',
    nullable: false,
    enum: COMMISSION_ROLE,
    default: COMMISSION_ROLE.ALL
  })
  role: COMMISSION_ROLE

  @Column({
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: COMMISSIONS_STATUS
  })
  status: COMMISSIONS_STATUS

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_applied_to_all'
  })
  isAppliedToAll: Boolean

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_applied_to_sp'
  })
  isAppliedToSp: Boolean

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_applied_to_spc'
  })
  isAppliedToSpc: Boolean

  @ManyToMany((type) => User)
  @JoinTable()
  users: User[]
}
