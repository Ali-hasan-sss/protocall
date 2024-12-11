import { Base } from "src/resources/base.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SlotCalender extends Base {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'date',
    nullable: false,
    type: 'date'
  })
  public date: Date;

  @Column({
    name: 'slot_start_time',
    nullable: true,
    type: 'timestamp',
  })
  public slotStartTime: Date;

  @Column({
    name: 'slot_end_time',
    nullable: true,
    type: 'timestamp',
  })
  public slotEndTime: Date;
}
