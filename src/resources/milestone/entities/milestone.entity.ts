import { MILESTONE_STATUS } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { Project } from "src/resources/project/entities/project.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { File } from '../../file/entities/file.entity';
import { Payout } from "src/resources/payouts/entities/payout.entity";

@Entity()
export class Milestone extends Base {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'title',
    nullable: true,
    type: 'text'
  })
  title: string

  @Column({
    name: 'intent_secret',
    type: 'text',
    // length: 350,
    nullable: true
  })
  intentSecret: string

  @Column({
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: MILESTONE_STATUS,
    default: MILESTONE_STATUS.PAYMENT_PENDING
  })
  status: MILESTONE_STATUS

  @Column({
    name: 'remarks',
    nullable: true,
    type: 'text'
  })
  remarks: string

  @Column({
    name: 'days_to_complete',
    type: 'int',
    nullable: true
  })
  daysToComplete: number

  @Column({
    name: 'payment_to_be_released',
    type: 'float',
    nullable: true
  })
  paymentToBeReleased: number

  @Column({
    name: 'buffer',
    type: 'int',
    nullable: true
  })
  buffer: number

  @Column({
    name: 'time_sheet',
    nullable: true,
    type: 'text'
  })
  timeSheet: string

  @Column({
    name: 'deliverables',
    nullable: true,
    type: 'text'
  })
  deliverables: string

  @Column({
    name: 'is_completed',
    type: 'boolean',
    nullable: true,
    default: false
  })
  isCompleted: boolean

  @Column({
    name: 'payment_request_made',
    type: 'boolean',
    nullable: true,
    default: false
  })
  paymentRequestMade: boolean

  @Column({
    name: 'payment_release_request_made',
    type: 'boolean',
    nullable: true,
    default: false
  })
  paymentReleaseRequestMade: boolean

  @ManyToMany((type) => File, {
    eager: true
  })
  @JoinTable()
  files: File[]

  @ManyToOne(() => Project, project => project.milestones, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_project',
  })
  project

  @OneToMany(() => Payout, payout => payout.project)
  payouts:  Payout[];
}
