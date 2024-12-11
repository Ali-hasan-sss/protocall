import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { File } from "src/resources/file/entities/file.entity";
import { Base } from "src/resources/base.entity";

@Entity()
export class Invoice extends Base {

  @PrimaryGeneratedColumn()
  id: number

  @Column({
    type: 'boolean',
    default: false,
    name: 'arrived_at_location'
  })
  arrivedAtLocation: Boolean

  @Column({
    type: 'boolean',
    default: false,
    name: 'service_started'
  })
  serviceStarted: Boolean

  @Column({
    type: 'boolean',
    default: false,
    name: 'service_ended'
  })
  serviceEnded: Boolean

  @Column({
    type: 'timestamp',
    name: 'service_start_date',
    nullable: true
  })
  serviceStartDate?: Date

  @Column({
    type: 'timestamp',
    name: 'service_end_date',
    nullable: true
  })
  serviceEndDate?: Date

  @Column({
    name: 'extra_charges',
    nullable: true,
    type: 'text',
  })
  extraCharges: string

  @Column({
    name: 'remarks',
    nullable: true,
    type: 'text',
  })
  remarks: string

  @Column({
    name: 'grand_total',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  grandTotal: number

  @Column({
    name: 'service_cost',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  serviceCost: number

  @Column({
    name: 'total_extra_charges',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  totalExtraCharges: number

  @Column({
    name: 'total_service_cost',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  totalServiceCost: number

  @Column({
    name: 'taxes_payable',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  taxesPayable: number

  @Column({
    name: 'visiting_charges',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  visitingCharges: number
  
  @ManyToOne(() => File, file => file.invoiceServiceStartPictures, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_service_start_picture',
  })
  serviceStartPicture

  @ManyToOne(() => File, file => file.invoiceServiceEndPictures, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_service_end_picture',
  })
  serviceEndPicture

  @OneToOne(() => BookService, bookService => bookService.invoice, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_book_service',
  })
  bookService
}
