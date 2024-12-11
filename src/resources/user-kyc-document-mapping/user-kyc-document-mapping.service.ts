import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FileService } from '../file/file.service';
import { UserService } from '../user/user.service';
import { CreateUserKycDocumentMappingDto } from './dto/create-user-kyc-document-mapping.dto';
import { UpdateUserKycDocumentMappingDto } from './dto/update-user-kyc-document-mapping.dto';
import { UserKycDocumentMapping } from './entities/user-kyc-document-mapping.entity';
import { diskNames } from 'src/global/disk-names';

@Injectable()
export class UserKycDocumentMappingService {
  constructor(
    @InjectRepository(UserKycDocumentMapping) private userKycDocumentMappingRepository: Repository<UserKycDocumentMapping>,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(FileService) private readonly fileService: FileService
  ) { }
  create(createUserKycDocumentMappingDto: CreateUserKycDocumentMappingDto) {
    return 'This action adds a new userKycDocumentMapping';
  }

  findAll() {
    return `This action returns all userKycDocumentMapping`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userKycDocumentMapping`;
  }

  update(id: number, updateUserKycDocumentMappingDto: UpdateUserKycDocumentMappingDto) {
    return `This action updates a #${id} userKycDocumentMapping`;
  }

  remove(id: number) {
    return `This action removes a #${id} userKycDocumentMapping`;
  }

  async uploadKycDocuments(files, replaceMappingId, userTokenData) {
    try {
      if(replaceMappingId.length){
        await this.userKycDocumentMappingRepository.delete({
          id: In(replaceMappingId)
        })
      }
      if (files) {
        for (let index = 0; index < Object.keys(files).length; index++) {
          let file: any = { docName: '', documentType: '' };
          let docType: number;
          let key = Object.keys(files)[index];
          file['docName'] = key
          if (key === 'id-proof') {
            docType = 5;
          }
          if (key === 'quali') {
            docType = 6;
          }
          if (key === 'certifi') {
            docType = 7;
          }

          for (let index = 0; index < files[key].length; index++) {
            const file = files[key][index];
            // Upload file and create an entry in file table;
            let result = await this.fileService.save(
              files[key][0].buffer,
              diskNames.USER,
              files[key][0].originalname,
              docType,
              files[key][0].size,
              files[key][0].mimetype
            );

            let createInstance = await this.userKycDocumentMappingRepository.create({
              file: {
                id: result.id
              },
              user: {
                id: userTokenData.appUserId
              }
            })

            await this.userKycDocumentMappingRepository.save(createInstance)
          }
        }
        await this.userService.update(userTokenData.appUserId, {
          isKycDone: true
        })
      }
      return await this.userKycDocumentMappingRepository.find({
        where: {
          user: {
            id: userTokenData.appUserId
          }
        }
      })
    } catch (err) {
      throw err;
    }
  }
}
