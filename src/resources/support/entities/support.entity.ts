import { ROLE, SUPPORT_CATEGORY } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { Project } from "src/resources/project/entities/project.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { File } from 'src/resources/file/entities/file.entity';

@Entity()
export class Support extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'boolean',
    default: true,
    name: 'isOpen'
  })
  isOpen: Boolean

  @Column({
    name: 'remarks',
    type: 'text',
    nullable: true
  })
  remarks: string

  @Column({
    name: 'title',
    type: 'text',
    nullable: true
  })
  title: string

  @Column({
    name: 'description',
    type: 'text',
    nullable: true
  })
  description: string

  @Column({
    name: 'category',
    type: 'enum',
    enum: SUPPORT_CATEGORY,
    default: SUPPORT_CATEGORY.PROJECT
  })
  category: SUPPORT_CATEGORY

  @Column({
    name: 'role',
    type: 'enum',
    enum: ROLE,
    nullable: true
  })
  role: ROLE

  @Column({
    name: 'chat_id',
    type: 'text',
    nullable: true,
    default: null
  })
  chatId: string

  @Column({
    name: 'chat_id_details',
    type: 'text',
    nullable: true,
    default: null
  })
  chatIdDetails: string

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
  
  @ManyToOne(() => User, user => user.raisedBys, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: false
  })
  @JoinColumn({
    name: 'fk_id_raised_by_user',
  })
  raisedBy

  @ManyToOne(() => Project, project => project.supports, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_project',
  })
  project

  @ManyToOne(() => Service, service => service.supports, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_service',
  })
  service

  @ManyToOne(() => File, file => file.supports, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_support_file',
  })
  supportFile
}
