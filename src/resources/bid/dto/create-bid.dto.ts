import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class CreateBidDto {

  @IsNumber()
  @IsNotEmpty({
    message: 'Bid Amount cannot be empty'
  })
  @Min(1, {
    message: 'Cannot be less then $1'
  })
  public bidAmount: number

  @IsNotEmpty({
    message: 'Project Id is mandatory'
  })
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
    maxDecimalPlaces: 0
  }, {
    message: 'Invalid ProjectId'
  })
  public projectId: number
}
