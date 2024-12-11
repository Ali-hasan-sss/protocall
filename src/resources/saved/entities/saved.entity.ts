import { ROLE } from "src/global/enums";
import { Base } from "src/resources/base.entity";
import { Project } from "src/resources/project/entities/project.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Saved extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'role',
    type: 'enum',
    enum: ROLE,
    default: ROLE.SERVICE_PROVIDER
  })
  role: ROLE
  
  @ManyToOne(() => User, user => user.saved, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: false
  })
  @JoinColumn({
    name: 'fk_id_client_user',
  })
  user

  @ManyToOne(() => Project, project => project.saved, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_project',
  })
  project

  @ManyToOne(() => Service, service => service.saved, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true
  })
  @JoinColumn({
    name: 'fk_id_service',
  })
  service
}
