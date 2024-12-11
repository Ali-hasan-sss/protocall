import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { CryptoUtils } from "src/utils/crypto.utils";
import * as moment from "moment";
import { InjectRepository } from "@nestjs/typeorm";
import { Project } from "../project/entities/project.entity";
import { MoreThan, Repository } from "typeorm";
import { Service } from "../services/entities/service.entity";
import { PROJECT_STATUS, SERVICE_STATUS } from "src/global/enums";

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(Service) private serviceRepository: Repository<Service>
  ) {}

  async create(entityType: string, id: number) {
    try {
      if (!entityType || !id) {
        throw new BadRequestException("Cannot produce shareId");
      }
      const data = CryptoUtils.encryptString(
        JSON.stringify({ entityType, id })
      );
      if (!data.toString()) {
        throw new BadRequestException("Cannot produce shareId");
      }
      return {
        shareId: data.toString("base64url"),
        timeStamp: moment().format()
      };
    } catch (error) {
      throw new BadRequestException("Cannot produce shareId");
    }
  }

  async getData(id: string) {
    try {
      if (!id || id?.length === 0) {
        throw new BadRequestException("Provide valid shareid");
      }
      const data = CryptoUtils.decryptString(id);
      if (!data.toString() || data === id) {
        throw new BadRequestException("Cannot produce data");
      }
      const dataObject: {
        entityType: string;
        id: number;
      } = JSON.parse(data.toString());
      if (dataObject?.entityType && dataObject?.id) {
        if (dataObject?.entityType === "project") {
          const project = await this.projectRepository.findOne({
            where: {
              id: dataObject?.id,
              biddingEndDate: MoreThan(moment().toDate()),
              status: PROJECT_STATUS.POSTED
            }
          });
          if (project) {
            return {
              type: "project",
              id: project.id,
              accessible: true,
              status: project.status
            };
          } else {
            return {
              accessible: false,
              status: "NOT_AVAILABLE"
            };
          }
        }
        if (dataObject?.entityType === "service") {
          const service = await this.serviceRepository.findOne({
            where: {
              id: dataObject?.id,
              status: SERVICE_STATUS.ACTIVE
            }
          });
          if (service) {
            return {
              type: "service",
              id: service.id,
              accessible: true,
              status: service.status
            };
          } else {
            return {
              accessible: false,
              status: "NOT_AVAILABLE"
            };
          }
        }
      }
      throw new NotFoundException(
        "Cannot find project/service for provided shareid"
      );
    } catch (error) {
      throw new NotFoundException(
        "Cannot find project/service for provided shareid"
      );
    }
  }

  notAvailableOperation() {
    return "This action is not available";
  }
}
