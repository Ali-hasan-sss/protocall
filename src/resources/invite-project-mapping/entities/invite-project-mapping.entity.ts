import { Project } from "src/resources/project/entities/project.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class InviteProjectMapping {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => User, user => user.inviteProjectMappings, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_user',
  })
  user

  @ManyToOne(() => Project, project => project.inviteProjectMappings, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_project',
  })
  project

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
}
