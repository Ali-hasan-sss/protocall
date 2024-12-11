import { COST_TYPE, SERVICE_STATUS } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { File } from "src/resources/file/entities/file.entity";
import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import * as _ from 'underscore';
import * as moment from 'moment';
import { SubCategory } from "src/resources/sub-category/entities/sub-category.entity";
import { User } from "src/resources/user/entities/user.entity";
import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { Support } from "src/resources/support/entities/support.entity";
import { Saved } from "src/resources/saved/entities/saved.entity";
import { Notification } from "src/resources/notifications/entities/notification.entity";
import { Payout } from "src/resources/payouts/entities/payout.entity";

@Entity()
export class Service extends Base {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'headline',
    nullable: false,
    type: 'text'
  })
  headline: string

  @Column({
    name: 'description',
    nullable: false,
    type: 'text'
  })
  description: string

  @Column({
    name: 'cost_type',
    type: 'enum',
    nullable: false,
    enum: COST_TYPE
  })
  costType: COST_TYPE

  @Column({
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: SERVICE_STATUS
  })
  status: SERVICE_STATUS

  @Column({
    name: 'service_cost',
    type: 'float',
    nullable: false
  })
  serviceCost: number

  @Column({
    name: 'visiting_charges',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  visitingCharges: number

  @Column({
    name: 'cancellation_charges',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  cancellationCharges: number

  @Column({
    name: 'total_earned',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  totalEarned: number


  @Column({
    name: 'total_earned_after_commission',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  totalEarnedAfterCommission: number

  @Column({
    name: 'faq',
    nullable: true,
    type: 'text'
  })
  faq: string

  @Column({
    name: 'inclusions',
    nullable: true,
    type: 'text'
  })
  inclusions: string

  @Column({
    name: 'non_inclusions',
    nullable: true,
    type: 'text'
  })
  nonInclusions: string

  @Index()
  @ManyToOne(() => User, user => user.services, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: false
  })
  @JoinColumn({
    name: 'fk_id_user',
  })
  user

  @OneToMany(() => BookService, bookService => bookService.service)
  bookServices: BookService[];

  // File many to many relation
  @ManyToMany((type) => File)
  @JoinTable()
  files: File[]

  // Category many to many relation
  @ManyToMany((type) => SubCategory, {
    eager: true
  })
  @JoinTable()
  subCategories: SubCategory[]

  @OneToMany(() => Support, support => support.service)
  supports: Support[];

  @OneToMany(() => Payout, payout => payout.service)
  payouts:  Payout[];

  @OneToMany(() => Saved, saved => saved.service)
  saved: Saved[];

  @OneToMany(() => Notification, notification => notification.service)
  notifications: Notification[];
}
