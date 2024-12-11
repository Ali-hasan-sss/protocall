import { ROLE } from "src/global/enums"

export class CreateNotificationDto {
  public userId: number
  public role: ROLE
  public title: string
  public description: string
  public serviceId: string | null
  public projectId: string | null
  public config: any
  public bookServiceId?: string | null
}
