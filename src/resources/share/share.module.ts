import { Module } from "@nestjs/common";
import { ShareService } from "./share.service";
import { ShareController } from "./share.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "../project/entities/project.entity";
import { Service } from "../services/entities/service.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Project, Service])],
  controllers: [ShareController],
  providers: [ShareService]
})
export class ShareModule {}
