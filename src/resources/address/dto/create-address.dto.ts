import { IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CreateAddressDto {
  @IsString({
    message: 'Invalid type'
  })
  @IsNotEmpty({
    message: 'Code cannot be empty'
  })
  addressLine1?: string
  
  @IsString({
    message: 'Invalid type'
  })
  @IsOptional({
    message: 'Code cannot be empty'
  })
  addressLine2: string
  
  @IsString({
    message: 'Invalid type'
  })
  @IsOptional({
    message: 'Code cannot be empty'
  })
  addressLine3: string
  
  @IsString({
    message: 'Invalid type'
  })
  @IsOptional({
    message: 'Code cannot be empty'
  })
  postcode: string
}
