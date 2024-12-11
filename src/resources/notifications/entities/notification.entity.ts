import { ROLE } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { Project } from "src/resources/project/entities/project.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, Entity } from "typeorm";

@Entity()
export class Notification extends Base {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'title',
    nullable: true,
    type: 'text'
  })
  title: string

  @Column({
    name: 'description',
    nullable: true,
    type: 'text'
  })
  description: string

  @Column({
    name: 'is_read',
    type: 'boolean',
    nullable: true,
    default: false
  })
  isRead: boolean

  @Column({
    name: 'config',
    nullable: true,
    type: 'text'
  })
  config: string

  @Column({
    name: 'role',
    type: 'enum',
    enum: ROLE
  })
  role: ROLE

  // to get which user has created the service
  @ManyToOne(() => Service, service => service.notifications, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_service'
  })
  service

  // to get which user has created the service
  @ManyToOne(() => Project, project => project.notifications, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'fk_id_project'
  })
  project

  // to get which user has created the service
  @ManyToOne(() => User, user => user.notifications, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'fk_id_user'
  })
  user
  
  @ManyToOne(() => BookService, bookService => bookService.notifications, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'fk_id_book_service'
  })
  bookService
}
