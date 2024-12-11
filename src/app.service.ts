import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { BOOKING_STATUS, COST_TYPE, GENDER, PROJECT_PREFS, PROJECT_STATUS, ROLE, SERVICE_STATUS, SLOT_STATUS } from './global/enums';
import { CategoryMasterService } from './resources/category-master/category-master.service';
import { DocumentTypeService } from './resources/document-type/document-type.service';
import { SkillsService } from './resources/skills/skills.service';
import { SlotCalenderService } from './resources/slot-calender/slot-calender.service';
import { SubCategoryService } from './resources/sub-category/sub-category.service';
@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @Inject(DocumentTypeService) private readonly documentTypeService: DocumentTypeService,
    @Inject(CategoryMasterService) private readonly categoryMasterService: CategoryMasterService,
    @Inject(SubCategoryService) private readonly subCategoryService: SubCategoryService,
    @Inject(SlotCalenderService) private readonly slotCalenderService: SlotCalenderService,
    @Inject(SkillsService) private readonly skillsService: SkillsService,
  ) { }
  async onApplicationBootstrap() {
    // Here we seed start up data every-time the application is bootstrapped

    // EVERYTIME SEED DATA 
    await this.documentTypeService.seedDocumentTypeData();


    // ONE TIME SEED DATA
    await this.categoryMasterService.seedOneTimeCategoryData();
    await this.subCategoryService.seedOneTimeSubCategoryData();
    await this.slotCalenderService.seedOneTimeCalenderData();
    await this.skillsService.seedOneTimeSkillData()
  }

  async enums() {
    return {
      COST_TYPE: COST_TYPE,
      ROLE: ROLE,
      GENDER: GENDER,
      SERVICE_STATUS: SERVICE_STATUS,
      PROJECT_STATUS: PROJECT_STATUS,
      PROJECT_PREFS: PROJECT_PREFS,
      SLOT_STATUS: SLOT_STATUS,
      BOOKING_STATUS: BOOKING_STATUS
    }
  }

  googleLogin(req) {
    if (!req.user) {
      return 'No user from google'
    }

    console.log(req.user);
    return {
      message: 'User information from google',
      user: req.user
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
