import { SLOT_STATUS } from "src/global/enums";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UserSlotCalender {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'date',
    nullable: false,
    type: 'date'
  })
  public date: Date;

  @Column({
    name: '8am-9am',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  eight: SLOT_STATUS

  @Column({
    name: '9am-10am',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  nine: SLOT_STATUS

  @Column({
    name: '10am-11am',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  ten: SLOT_STATUS

  @Column({
    name: '11am-12pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  eleven: SLOT_STATUS

  @Column({
    name: '12pm-1pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  twelve: SLOT_STATUS

  @Column({
    name: '1pm-2pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  thirteen: SLOT_STATUS

  @Column({
    name: '2pm-3pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  fourteen: SLOT_STATUS

  @Column({
    name: '3pm-4pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  fifteen: SLOT_STATUS

  @Column({
    name: '4pm-5pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  sixteen: SLOT_STATUS

  @Column({
    name: '5pm-6pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  seventeen: SLOT_STATUS

  @Column({
    name: '6pm-7pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  eighteen: SLOT_STATUS

  @Column({
    name: '7pm-8pm',
    type: 'enum',
    nullable: false,
    default: SLOT_STATUS.AVAILABLE,
    enum: SLOT_STATUS
  })
  nineteen: SLOT_STATUS

  @ManyToOne(() => User, user => user.userSlotCalenders, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: false
  })
  @JoinColumn({
    name: 'fk_id_user',
  })
  user
}
