import { Base } from "src/resources/base.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Device extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name:'unique_id'
  })
  uniqueId: string

  @Column({
    name: 'device_name',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  deviceName?: string
  
  @Column({
    name: 'fcm_token',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  fcmToken?: string
  
  @ManyToOne(() => User, user => user.devices ,{
    nullable: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'fk_id_user'
  })
  user: User
}
