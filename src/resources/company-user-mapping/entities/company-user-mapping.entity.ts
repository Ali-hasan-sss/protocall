import { COMPANY_ROLE } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class CompanyUserMapping extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'role',
    type: 'enum',
    enum: COMPANY_ROLE
  })
  role: COMPANY_ROLE

  @ManyToOne(() => User, user => user.companies, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_company',
  })
  company

  @ManyToOne(() => User, user => user.teamMembers, {
    nullable: true,
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_team_member',
  })
  teamMember
}
