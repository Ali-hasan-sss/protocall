import { TAX_MASTER_STATUS, TAX_TYPE } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TaxMaster extends Base {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'tax_unique_Id',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  taxUniqueId?: string

  @Column({
    name: 'tax_percentage',
    type: 'float',
    nullable: true,
    default: 0.0
  })
  taxPercentage: number

  @Column({
    name: 'state',
    type: 'text',
    nullable: true,
  })
  state: string
  
  @Column({
    name: 'tax_type',
    type: 'enum',
    nullable: false,
    enum: TAX_TYPE,
    default: TAX_TYPE.GENERAL
  })
  taxType: TAX_TYPE

  @Column({
    name: 'status',
    type: 'enum',
    nullable: false,
    enum: TAX_MASTER_STATUS
  })
  status: TAX_MASTER_STATUS

  @Column({
    name: 'from_postcode',
    type: 'int',
    nullable: true,
  })
  fromPostcode: number

  @Column({
    name: 'to_postcode',
    type: 'int',
    nullable: true,
  })
  toPostcode: number

  @Column({
    name: 'zip_codes',
    type: 'text',
    nullable: true,
  })
  zipCodes: string
}
