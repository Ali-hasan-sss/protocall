import { BOOKING_STATUS } from "src/global/enums";
import { Address } from "src/resources/address/entities/address.entity";
import { Base } from "src/resources/base.entity";
import { Invoice } from "src/resources/invoice/entities/invoice.entity";
import { Notification } from "src/resources/notifications/entities/notification.entity";
import { Payout } from "src/resources/payouts/entities/payout.entity";
import { Review } from "src/resources/review/entities/review.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
@Index(["orderUniqueId", "user"], { unique: true })
@Index(["orderUniqueId", "user", "service", "assignedToUser"], { unique: true })
export class BookService extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    name: 'order_unique_id',
    type: 'varchar',
    length: 255
  })
  orderUniqueId: string

  @Column({
    name: 'intent_secret',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  intentSecret: string

  @Column({
    name: 'receiver_name',
    type: 'varchar',
    length: 255
  })
  receiverName: string

  @Column({
    name: 'receiver_email',
    type: 'varchar',
    length: 255
  })
  receiverEmail: string

  @Column({
    name: 'slot_ref',
    nullable: true,
    type: 'text',
  })
  slotRef: string // {<{date: <column_Name>}>}

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
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: BOOKING_STATUS,
    default: BOOKING_STATUS.VISITING_CHARGES_PENDING
  })
  status: BOOKING_STATUS

  @Column({
    name: 'total_amount',
    type: 'float',
    nullable: true
  })
  totalAmount: number

  @Column({
    name: 'total_commission_amount',
    type: 'float',
    nullable: true,
    default: 0,
  })
  totalCommissionAmount: number

  @Index()
  // to map with service
  @ManyToOne(() => Service, service => service.bookServices, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: false
  })
  @JoinColumn({
    name: 'fk_id_service',
  })
  service

  @Index()
  // to get which user has created the service
  @ManyToOne(() => User, user => user.bookServices, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_user'
  })
  user

  @Index()
  @ManyToOne(() => User, user => user.services, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_assigned_to_user',
  })
  assignedToUser

  // to save the address against the service which is booked
  @ManyToOne(() => Address, address => address.bookServices, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'fk_id_address'
  })
  address

  @OneToMany(() => Review, review => review.bookService)
  reviews: Review[];

  @OneToOne(() => Invoice, invoice => invoice.bookService)
  invoice: Invoice;

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

  @OneToMany(() => Notification, notification => notification.bookService)
  notifications: Notification[];

  @OneToOne(() => Payout, payout => payout.bookService)
  payout: Payout;
}
