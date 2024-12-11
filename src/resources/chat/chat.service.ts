import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { getFirestore } from "firebase-admin/firestore";
import { User } from "../user/entities/user.entity";
import { UpdateChatDto } from "./dto/update-chat.dto";
import { QueryChatDto } from "./dto/query-chat.dto";
import { CHAT_PROFILE_TYPE } from "../../global/enums";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  async userDetails(id: number) {
    if (id === 0) {
      return {
        id: 0,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        profilePicId: null
      };
    }
    const user = await this.userRepository.findOne({
      where: {
        id
      }
    });

    if (user) {
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicId: user.profilePicId
      };
    }
    return null;
  }

  async findOne(query: QueryChatDto) {
    try {
      let id =
        `${query.type}-${query.typeId}-${query.ownerType}-${query.ownerId}-${query.userType}-${query.userId}`.toLowerCase();

      if (!id || id.length <= 0) {
        throw new BadRequestException("Invalid chat id!");
      }

      const db = getFirestore();
      const docRef = db.collection("chats").doc(id);
      const doc = await docRef.get();

      let data = null;
      let users = [];

      if (!doc.exists) {
        const getRoleGroup = (type) =>
          type === CHAT_PROFILE_TYPE.PRO || type === CHAT_PROFILE_TYPE.COM
            ? "provider"
            : type === CHAT_PROFILE_TYPE.CLI
            ? "client"
            : "admin";

        const addedData = {
          active: true,
          type: query.type.toLowerCase(),
          id: Number(query.typeId),
          memberIds: [query.ownerId, query.userId],
          members: [
            {
              id: query.ownerId,
              roleGroup: getRoleGroup(query.ownerType)
            },
            {
              id: query.userId,
              roleGroup: getRoleGroup(query.userType)
            }
          ]
        };

        await db.collection("chats").doc(id).set(addedData);
        data = addedData;
      } else {
        data = doc.data();
      }

      if (data.memberIds && data.memberIds.length) {
        for (let index = 0; index < data.memberIds.length; index++) {
          const user = await this.userDetails(data.memberIds[index]);
          if (user) users.push(user);
        }
      }

      return {
        chatId: id,
        users: users || [],
        data: data || {}
      };
    } catch (error) {
      throw error;
    }
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates nothing!`;
  }

  remove(id: number) {
    return `This action removes nothing!`;
  }
}
