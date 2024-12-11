import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator, ValidationOptions } from "class-validator";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { SubCategory } from "src/resources/sub-category/entities/sub-category.entity";
import { In, Repository } from "typeorm";

@ValidatorConstraint({ name: 'UserExists', async: true })
@Injectable()
export class SubCategoryExistsRule implements ValidatorConstraintInterface {

  constructor(@InjectRepository(SubCategory) private subCategoryRepository: Repository<SubCategory>) { }

  async validate(value: Array<number>) {
    try {
      await this.subCategoryRepository.count({
        where: {
          id: In(value)
        }
      });
    } catch (e) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `Sub Category doesn't exist`;
  }
}

export function SubCategoryExists(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'SubCategoryExists',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: SubCategoryExistsRule,
    });
  };
}
