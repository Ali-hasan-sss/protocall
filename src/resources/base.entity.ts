import { Column, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from "typeorm";

export class Base {
  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  public created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  public updated_at: Date;

  @DeleteDateColumn()
  public deletedAt: Date;
}
