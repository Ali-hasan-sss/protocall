import { File } from "src/resources/file/entities/file.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UserKycDocumentMapping {
  @PrimaryGeneratedColumn()
  id: number;
  

  @ManyToOne(() => User, user => user.kycDocumentMappings, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'fk_id_user'
  })
  user

  @ManyToOne(() => File, file => file.kycDocumentMappings, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: true
  })
  @JoinColumn({
    name: 'fk_id_file'
  })
  file
  
}
