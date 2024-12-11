import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator"
import { ROLE } from "src/global/enums"

export class CreateReviewDto {

  @IsNumber()
  review1: number

  @IsNumber()
  review2: number

  @IsNumber()
  review3: number

  @IsNumber()
  review4: number

  @IsNumber()
  review5: number

  @IsNumber()
  review6: number

  @IsNumber()
  feedback: string

  @IsNotEmpty()
  @IsEnum(ROLE, {
    each: true
  })
  role: ROLE

  @IsNotEmpty()
  userId: number 
  
  @IsNumber()
  bookingId: number 

  @IsNumber()
  projectId: number 
}
