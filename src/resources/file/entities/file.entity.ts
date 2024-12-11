import { Base } from "src/resources/base.entity";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { DocumentType } from "src/resources/document-type/entities/document-type.entity";
import { Invoice } from "src/resources/invoice/entities/invoice.entity";
import { Milestone } from "src/resources/milestone/entities/milestone.entity";
import { SubCategory } from "src/resources/sub-category/entities/sub-category.entity";
import { Support } from "src/resources/support/entities/support.entity";
import { UserKycDocumentMapping } from "src/resources/user-kyc-document-mapping/entities/user-kyc-document-mapping.entity";
import { User } from "src/resources/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class File extends Base {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  path: string

  @Column({
    name: 'disk_name',
    type: 'varchar',
    length: 255,
    nullable: false
  })
  diskName: string

  @Column({
    name: 'original_file_name',
    type: 'varchar',
    length: 255,
    nullable: false
  })
  originalFileName: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  name: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    default: 0
  })
  size: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  extension: string

  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 255,
    nullable: false
  })
  mimetype: string

  @ManyToOne(() => DocumentType, documentType => documentType.files, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'fk_id_document_type'
  })
  documentType: DocumentType

  @OneToMany(() => User, user => user.profilePicId)
  users: User[];

  @OneToMany(() => SubCategory, subCategory => subCategory.file)
  subcategories: SubCategory[];

  @OneToMany(() => CategoryMaster, category => category.file)
  categories: CategoryMaster[];

  @OneToMany(() => Support, user => user.supportFile)
  supports: User[];

  @OneToMany(() => Invoice, invoice => invoice.serviceEndPicture)
  invoiceServiceEndPictures: Invoice[];

  @OneToMany(() => UserKycDocumentMapping, userKycDocumentMapping => userKycDocumentMapping.file)
  kycDocumentMappings: UserKycDocumentMapping[];

  @OneToMany(() => Invoice, invoice => invoice.serviceStartPicture)
  invoiceServiceStartPictures: Invoice[];
}
