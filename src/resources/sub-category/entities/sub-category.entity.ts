import { SUB_CATEGORIES_STATUS } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { File } from "src/resources/file/entities/file.entity";
import { PrimaryGeneratedColumn, Index, Column, Entity, OneToMany, ManyToOne, JoinColumn, JoinTable, ManyToMany } from "typeorm";

@Entity()
export class SubCategory extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    name: 'code',
    nullable: false,
    type: 'varchar',
    length: 255
  })
  code: string

  @Column({
    name: 'description',
    nullable: true,
    type: 'text',
  })
  description: string

  @Column({
    name: 'keywords',
    nullable: true,
    type: 'text',
  })
  keywords: string

  @Column({
    name: 'status',
    type: 'enum',
    default: SUB_CATEGORIES_STATUS.INACTIVE,
    enum: SUB_CATEGORIES_STATUS
  })
  status: SUB_CATEGORIES_STATUS

  @Index()
  @Column({
    name: 'name',
    nullable: false,
    type: 'varchar',
    length: 255
  })
  name: string

  @ManyToOne(() => File, file => file.subcategories, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_file',
  })
  file

  @ManyToOne(() => CategoryMaster, (categoryMaster) => categoryMaster.subCategory, {
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_category_master'
  })
  categoryMaster: CategoryMaster
}
