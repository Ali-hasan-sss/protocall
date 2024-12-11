import { Base } from "src/resources/base.entity";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class AccessToken extends Base {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'token',
    length: 255,
    type: 'varchar',
    nullable: false
  })
  token: string

  @Column({
    name: 'refresh_token',
    length: 255,
    type: 'varchar',
    nullable: false
  })
  refreshToken: string

  @Column({
    type: 'timestamp',
    name: 'token_expiry',
    nullable: true
  })
  tokenExpiry?: Date

  @Column({
    type: 'timestamp',
    name: 'refresh_token_expiry',
    nullable: true
  })
  refreshTokenExpiry?: Date

  @Column({
    type: 'text',
    nullable: true,
    name: 'tokenData'
  })
  tokenData?: string

  @Column({
    name: 'ip',
    length: 255,
    type: 'varchar',
    nullable: true
  })
  ip: string
}
