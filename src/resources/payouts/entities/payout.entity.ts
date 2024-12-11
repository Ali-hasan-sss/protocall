import { PAYOUT_STATUS } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { Milestone } from "src/resources/milestone/entities/milestone.entity";
import { Project } from "src/resources/project/entities/project.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Payout extends Base {

  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'made_by_client',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  madeByClient: number

  @Column({
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: PAYOUT_STATUS,
    default: PAYOUT_STATUS.PENDING
  })
  status: string

  @Column({
    name: 'tax_amount',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  taxAmount: number

  @Column({
    name: 'commission',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  commission: number

  @Column({
    name: 'payableToSP',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  payableToSP: number

  @Column({
    name: 'netEarning',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  netEarning: number

  // to get which user has created the service
  @ManyToOne(() => User, user => user.clientPayout, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_client_user'
  })
  clientUser

  // to get which user has created the service
  @ManyToOne(() => User, user => user.serviceProviderPayout, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_service_provider_user'
  })
  serviceProviderUser

  @ManyToOne(() => Project, project => project.payouts, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_project',
  })
  project

  @ManyToOne(() => Service, service => service.payouts, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_service',
  })
  service

  @ManyToOne(() => Milestone, milestone => milestone.payouts, {
    onDelete: 'CASCADE',
    eager: false,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_milestone',
  })
  milestone

  @Column({
    name: 'milestone_payment_release_request',
    type: 'boolean',
    nullable: true,
    default: false
  })
  milestonePaymentReleaseRequest: boolean

  @OneToOne(() => BookService, bookservice => bookservice.payout, {
    eager: false,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_book_service',
  })
  bookService
}
