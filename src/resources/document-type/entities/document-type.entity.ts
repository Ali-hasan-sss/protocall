import { Base } from "src/resources/base.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import {File} from '../../file/entities/file.entity';

@Entity()
export class DocumentType extends Base {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
      type: 'varchar',
      length: 255,
      nullable: false
    })
    name: string

    @Column({
      type: 'varchar',
      length: 255,
      nullable: false
    })
    code: string

    @Column({
        type: 'text',
    })
    description: string

    @Column({
      type: 'json',
      nullable: true
    })
    config?: string

    @OneToMany(() => File, file => file.documentType)
    files: File[];
}
