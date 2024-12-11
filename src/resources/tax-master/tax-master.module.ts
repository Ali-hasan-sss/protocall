import { Module } from '@nestjs/common';
import { TaxMasterService } from './tax-master.service';
import { TaxMasterController } from './tax-master.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxMaster } from './entities/tax-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaxMaster])],
  controllers: [TaxMasterController],
  providers: [TaxMasterService]
})
export class TaxMasterModule {}
