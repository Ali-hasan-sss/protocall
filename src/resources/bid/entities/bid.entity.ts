import { Base } from "src/resources/base.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from '../../project/entities/project.entity';

@Entity()
export class Bid extends Base {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'description',
    nullable: true,
    type: 'text'
  })
  description: string

  @Column({
    name: 'bid_amount',
    type: 'float',
    nullable: true
  })
  bidAmount: number

  @Column({
    name: 'bidder_distance',
    type: 'float',
    nullable: true
  })
  bidderDistance: number

  @Column({
    name: 'is_shortlisted',
    type: 'boolean',
    nullable: true,
    default: false
  })
  isShortListed: boolean

  @Column({
    type: 'timestamp',
    name: 'approvedDate',
    nullable: true
  })
  approvedDate?: Date

  @Column({
    name: 'is_approved',
    type: 'boolean',
    nullable: true,
    default: false
  })
  isApproved: boolean

  @Column({
    name: 'unread_chat_count_client',
    type: 'int',
    default: 0
  })
  unreadChatCountClient: number

  @Column({
    name: 'tax_percentage',
    nullable: true,
    type: 'int',
    default: 0
  })
  taxPercentage: string

  @Column({
    name: 'tax_unique_code',
    nullable: true,
    type: 'text',
  })
  taxUniqueCode: string

  @Column({
    name: 'unread_chat_count_provider',
    type: 'int',
    default: 0
  })
  unreadChatCountProvider: number

  @ManyToOne(() => Project, project => project.bids, {
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_project',
  })
  project

  @ManyToOne(() => User, user => user.bids, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_user',
  })
  user

  @ManyToOne(() => User, user => user.services, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_assigned_to_user',
  })
  assignedToUser
}
