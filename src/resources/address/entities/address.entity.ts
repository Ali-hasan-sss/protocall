
import { Base } from "src/resources/base.entity";
import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Entity, OneToMany } from "typeorm";

@Entity()
export class Address extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'address_line_1',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  addressLine1?: string

  @Column({
    name: 'address_line_2',
    type: 'varchar',
    length: 255,
  })
  addressLine2: string

  @Column({
    name: 'address_line_3',
    type: 'varchar',
    nullable: false,
  })
  addressLine3: string

  @Column({
    name: 'postcode',
    length: 255,
    type: 'varchar',
    nullable: false,
  })
  postcode: string

  // can be null if user doesn't saves the address
  @ManyToOne(() => User, user => user.address, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_user'
  })
  user

  @OneToMany(() => BookService, bookService => bookService.address)
  bookServices: BookService[];
}
