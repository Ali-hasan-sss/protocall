import { ROLE } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { Project } from "src/resources/project/entities/project.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Review extends Base{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'review_1',
    type: 'float',
    nullable: true,
    default: 0.0,
  })
  review1: number

  @Column({
    name: 'review_2',
    type: 'float',
    nullable: true,
    default: 0.0,
  })
  review2: number

  @Column({
    name: 'review_3',
    type: 'float',
    nullable: true,
    default: 0.0,
  })
  review3: number

  @Column({
    name: 'review_4',
    type: 'float',
    nullable: true,
    default: 0.0,
  })
  review4: number

  @Column({
    name: 'review_5',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  review5: number

  @Column({
    name: 'review_6',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  review6: number

  @Column({
    name: 'avg_review',
    type: 'float',
    nullable: true
  })
  avg: number

  @Column({
    name: 'feedback',
    type: 'text',
    nullable: true
  })
  feedback: string

  @Column({
    name: 'role',
    type: 'enum',
    enum: ROLE
  })
  role: ROLE

  // to get which user has created the service
  @ManyToOne(() => User, user => user.reviews, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_user'
  })
  user

  // to get which user has created the service
  @ManyToOne(() => User, user => user.gReviews, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_given_user'
  })
  givenByUser

  // to get which user has created the service
  @ManyToOne(() => BookService, bookService => bookService.reviews, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_book_service'
  })
  bookService

  // to get which user has created the service
  @ManyToOne(() => Project, project => project.reviews, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_project'
  })
  project
}
