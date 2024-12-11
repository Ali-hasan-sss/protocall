import { CATEGORY_ASSOCIATE, CATEGORY_STATUS } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { Skills } from "src/resources/skills/skills.entity";
import { SubCategory } from "src/resources/sub-category/entities/sub-category.entity";
import { TaxMaster } from "src/resources/tax-master/entities/tax-master.entity";
import { File } from "src/resources/file/entities/file.entity";
import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class CategoryMaster extends Base {
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
    name: 'associate',
    type: 'enum',
    default: CATEGORY_ASSOCIATE.OFFSITE,
    enum: CATEGORY_ASSOCIATE
  })
  associate: CATEGORY_ASSOCIATE

  @Column({
    name: 'status',
    type: 'enum',
    default: CATEGORY_STATUS.INACTIVE,
    enum: CATEGORY_STATUS
  })
  status: CATEGORY_STATUS

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_taxable',
    nullable: true
  })
  isTaxable: Boolean

  @Index()
  @Column({
    name: 'name',
    nullable: false,
    type: 'varchar',
    length: 255
  })
  name: string

  @Column({
    name: 'faq',
    nullable: true,
    type: 'text'
  })
  faq: string

  @Column({
    name: 'icon',
    nullable: true,
    type: 'text'
  })
  icon: string

  @OneToMany(() => SubCategory, (subCategory) => subCategory.categoryMaster)
  subCategory: SubCategory[]

  @OneToMany(() => Skills, (skills) => skills.categoryMaster)
  skills: Skills[]

  @ManyToMany((type) => TaxMaster, { nullable: true })
  @JoinTable()
  taxMasters?: TaxMaster[]

  @ManyToOne(() => File, file => file.categories, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_file',
  })
  file
}
