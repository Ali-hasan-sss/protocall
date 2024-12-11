import { SKILL_STATUS } from "src/global/enums";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { PrimaryGeneratedColumn, Index, Column, Entity, OneToMany, ManyToOne, JoinColumn, JoinTable, ManyToMany } from "typeorm";
import { Base } from "../base.entity";

@Entity()
export class Skills extends Base{
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
    name: 'status',
    type: 'enum',
    default: SKILL_STATUS.INACTIVE,
    enum: SKILL_STATUS
  })
  status: SKILL_STATUS

  @Column({
    name: 'keywords',
    nullable: true,
    type: 'text',
  })
  keywords: string

  @Index()
  @Column({
    name: 'name',
    nullable: false,
    type: 'varchar',
    length: 255
  })
  name: string

  @ManyToOne(() => CategoryMaster, (categoryMaster) => categoryMaster.skills, {
    eager: true
  })
  @JoinColumn({
    name:'fk_id_category_master'
  })
  categoryMaster: CategoryMaster
}
