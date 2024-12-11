import { COST_TYPE, PROJECT_PREFS, PROJECT_STATUS, SERVICE_STATUS } from "src/global/enums";
import { InviteProjectMapping } from "src/resources/invite-project-mapping/entities/invite-project-mapping.entity";
import { Base } from "src/resources/base.entity";
import { Bid } from "src/resources/bid/entities/bid.entity";
import { SubCategory } from "src/resources/sub-category/entities/sub-category.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Milestone } from "src/resources/milestone/entities/milestone.entity";
import { Review } from "src/resources/review/entities/review.entity";
import { Support } from "src/resources/support/entities/support.entity";
import { Saved } from "src/resources/saved/entities/saved.entity";
import { Notification } from "src/resources/notifications/entities/notification.entity";
import { Payout } from "src/resources/payouts/entities/payout.entity";

@Entity()
export class Project extends Base {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'headline',
    nullable: true,
    type: 'text'
  })
  headline: string

  @Column({
    name: 'description',
    nullable: true,
    type: 'text'
  })
  description: string

  @Column({
    name: 'cost_type',
    type: 'enum',
    nullable: true,
    enum: COST_TYPE
  })
  costType: COST_TYPE

  @Column({
    name: 'status',
    type: 'enum',
    nullable: true,
    default: PROJECT_STATUS.DRAFT,
    enum: PROJECT_STATUS
  })
  status: PROJECT_STATUS

  @Column({
    name: 'project_preference',
    type: 'enum',
    nullable: true,
    enum: PROJECT_PREFS
  })
  projectPref: PROJECT_PREFS

  @Column({
    name: 'english_level',
    type: 'varchar',
    nullable: true,
    length: 255
  })
  englishLevel: string

  @Column({
    name: 'project_length',
    type: 'varchar',
    nullable: true,
    length: 255
  })
  projectLength: string

  @Column({
    name: 'can_bid',
    type: 'boolean',
    nullable: true,
    default: true
  })
  canBid: boolean

  @Column({
    type: 'timestamp',
    name: 'bidding_end_date',
    nullable: true
  })
  biddingEndDate?: Date

  @Column({
    type: 'text',
    name: 'bid_ending_string',
    nullable: true
  })
  bidEndingString?: string

  @Column({
    type: 'timestamp',
    name: 'project_start_date',
    nullable: true,
  })
  projectStartDate?: Date

  @Column({
    type: 'timestamp',
    name: 'project_end_date',
    nullable: true
  })
  projectEndDate?: Date

  @Column({
    name: 'service_min_cost',
    type: 'float',
    nullable: true
  })
  serviceMinCost: number

  @Column({
    name: 'total_amount',
    type: 'float',
    nullable: true
  })
  totalAmount: number

  @Column({
    name: 'total_amount_new',
    type: 'float',
    nullable: true,
    default: 0
  })
  totalAmountNew: number

  @Column({
    name: 'total_amount_after_commission',
    type: 'float',
    nullable: true
  })
  totalAmountAfterCommission: number

  @Column({
    name: 'service_max_cost',
    type: 'float',
    nullable: true
  })
  serviceMaxCost: number


  // Category many to many relation
  @ManyToMany((type) => SubCategory)
  @JoinTable()
  subCategories: SubCategory[]

  @OneToMany(() => Bid, bid => bid.project)
  bids: Bid[];

  @OneToMany(() => InviteProjectMapping, inviteProjectMapping => inviteProjectMapping.project)
  inviteProjectMappings: Bid[];

  @Column({
    name: 'unread_chat_count_client',
    type: 'int',
    default: 0
  })
  unreadChatCountClient: number

  @Column({
    name: 'unread_chat_count_provider',
    type: 'int',
    default: 0
  })
  unreadChatCountProvider: number

  @ManyToOne(() => User, user => user.services, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_user',
  })
  user

  @OneToMany(() => Milestone, milestone => milestone.project)
  milestones: Milestone[];

  @OneToMany(() => Review, review => review.project)
  reviews: Review[];

  @OneToMany(() => Support, support => support.project)
  supports: Support[];

  @OneToMany(() => Saved, saved => saved.project)
  saved: Saved[];

  @OneToMany(() => Payout, payout => payout.project)
  payouts:  Payout[];

  @OneToMany(() => Notification, notification => notification.project)
  notifications: Notification[];
}
