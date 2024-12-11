import { forwardRef, Module } from '@nestjs/common';
import { UserKycDocumentMappingService } from './user-kyc-document-mapping.service';
import { UserKycDocumentMappingController } from './user-kyc-document-mapping.controller';
import { UserKycDocumentMapping } from './entities/user-kyc-document-mapping.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../file/file.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserKycDocumentMapping]), forwardRef(() => FileModule), forwardRef(() => UserModule)],
  controllers: [UserKycDocumentMappingController],
  providers: [UserKycDocumentMappingService]
})
export class UserKycDocumentMappingModule {}
