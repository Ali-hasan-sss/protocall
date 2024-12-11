import { Exclude } from "class-transformer";
import { GENDER, LOGINTYPE, ROLE, USER_STATUS } from "src/global/enums";
import { Address } from "src/resources/address/entities/address.entity";
import { Base } from "src/resources/base.entity";
import { BookService } from "src/resources/book-service/entities/book-service.entity";
import { CategoryMaster } from "src/resources/category-master/entities/category-master.entity";
import { Service } from "src/resources/services/entities/service.entity";
import { SlotCalender } from "src/resources/slot-calender/entities/slot-calender.entity";
import { UserSlotCalender } from "src/resources/user-slot-calender/entities/user-slot-calender.entity";
import { File } from "src/resources/file/entities/file.entity";
import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Review } from "src/resources/review/entities/review.entity";
import { Bid } from "src/resources/bid/entities/bid.entity";
import { InviteProjectMapping } from "src/resources/invite-project-mapping/entities/invite-project-mapping.entity";
import { CompanyUserMapping } from "src/resources/company-user-mapping/entities/company-user-mapping.entity";
import { UserKycDocumentMapping } from "src/resources/user-kyc-document-mapping/entities/user-kyc-document-mapping.entity";
import { Support } from "src/resources/support/entities/support.entity";
import { Saved } from "src/resources/saved/entities/saved.entity";
import { Skills } from "src/resources/skills/skills.entity";
import { Notification } from "src/resources/notifications/entities/notification.entity";
import { Device } from "src/resources/device/entities/device.entity";
import { Payout } from "src/resources/payouts/entities/payout.entity";
import moment from "moment";

@Entity()
@Index(["firstName", "lastName"], { fulltext: true })
export class User extends Base {
    @PrimaryGeneratedColumn()
    id: number;

    @Exclude()
    @Column({
        name: 'stripe_account_id',
        type: 'varchar',
        length: 255,
        nullable: true
    })
    stripeAccountId?: string

    @Column({
        name: 'first_name',
        length: 255,
        type: 'varchar',
        nullable: false
    })
    firstName: string

    @Column({
        name: 'login_type',
        type: 'enum',
        nullable: true,
        default: LOGINTYPE.PROTOCALL,
        enum: LOGINTYPE
    })
    loginType: LOGINTYPE

    @Exclude()
    @Column({
        type: 'boolean',
        default: true,
        name: 'is_privacy_policy_checked'
    })
    isPrivacyPolicyChecked: Boolean

    @Column({
        type: 'boolean',
        default: false,
        name: 'is_team_member'
    })
    isTeamMember: Boolean

    @Exclude()
    @Column({
        type: 'boolean',
        default: true,
        name: 'is_toc_Checked'
    })
    isTocChecked: Boolean

    @Column({
        name: 'last_name',
        length: 255,
        type: 'varchar',
        nullable: true,
    })
    lastName: string

    @Column({
        name: 'email',
        length: 255,
        type: 'varchar',
        nullable: false,
    })
    email: string

    @Column({
        name: 'postcode',
        type: 'int',
        nullable: true,
    })
    postcode: number

    @Exclude()
    @Column({
        name: 'password',
        length: 255,
        type: 'varchar',
        nullable: true,
    })
    password: string

    @Exclude()
    @Column({
        name: 'salt',
        length: 255,
        type: 'varchar',
        nullable: true
    })
    salt: string

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description: string

    @Column({
        name: 'headline',
        type: 'text',
        nullable: true
    })
    headline: string

    @Column({
        name: 'connected_account_id',
        length: 255,
        type: 'varchar',
        nullable: true
    })
    connectedAccountId: string

    @Column({
        name: 'is_verified_by_stripe',
        type: 'boolean',
        nullable: true
    })
    isVerifiedByStripe: boolean

    @Column({
        name: 'website_link',
        length: 255,
        type: 'varchar',
        nullable: true,
    })
    websiteLink: string

    @Column({
        name: 'english_level',
        type: 'varchar',
        nullable: true,
        length: 255
    })
    englishLevel: string

    @Column({
        name: 'hourly_rate',
        type: 'float',
        nullable: true
    })
    hourRate: number

    @Exclude()
    @Column({
        name: 'gender',
        type: 'enum',
        nullable: true,
        enum: GENDER
    })
    gender: string

    @Exclude()
    @Column({
        name: 'date_of_birth',
        type: 'date',
        nullable: true
    })
    dateOfBirth: Date

    @Exclude()
    @Column({
        name: 'reset_password_otp_expiry',
        type: 'timestamp',
        nullable: true
    })
    resetPasswordOtpExpiry: Date

    @Exclude()
    @Column({
        name: 'reset_password_otp',
        type: 'varchar',
        length: 4,
        nullable: true
    })
    resetPasswordOtp: string

    @Exclude()
    @Column({
        type: 'boolean',
        default: false,
        name: 'is_reset_password_otp_verified'
    })
    isOtpVerified: Boolean

    // @Exclude()
    @Column({
        name: 'country_code',
        type: 'varchar',
        length: '4',
        nullable: true
    })
    countryCode: string

    @Column({
        name: 'country_flag_code',
        type: 'varchar',
        nullable: true,
        length:3,
        default: ""
    })
    countryFlagCode: string

    @Column({
        name: 'contact_number',
        type: 'varchar',
        length: 255,
        nullable: true
    })
    contactNumber: string

    @Column({
        name: 'role',
        type: 'enum',
        enum: ROLE
    })
    role: ROLE

    @Column({
        name: 'activity_status',
        type: 'enum',
        nullable: true,
        default: USER_STATUS.INACTIVE,
        enum: USER_STATUS
    })
    activityStatus: USER_STATUS

    @Column({
        name: 'secondary_role',
        type: 'enum',
        enum: ROLE,
        nullable: true
    })
    secondaryRole: ROLE

    @Column({
        default: false,
        name: 'is_second_role_active',
        type: 'boolean',
        nullable: true
    })
    isSecondRoleActive: Boolean

    @Exclude()
    @Column({
        default: false,
        name: 'is_kyc_done',
        type: 'boolean',
        nullable: true
    })
    isKycDone: Boolean

    @Column({
        default: false,
        name: 'is_onsite',
        type: 'boolean',
        nullable: true
    })
    isOnsite: Boolean

    @Column({
        default: false,
        name: 'is_offsite',
        type: 'boolean',
        nullable: true
    })
    isOffsite: Boolean

    @Column({
        name: 'total_hours',
        type: 'float',
        nullable: true
    })
    totalHours: number

    @Column({
        name: 'total_spent',
        type: 'float',
        nullable: true
    })
    totalSpent: number

    @Column({
        name: 'lat',
        type: 'float',
        nullable: true
    })
    lat: number

    @Column({
        name: 'lng',
        type: 'float',
        nullable: true
    })
    lng: number

    @Column({
        name: 'availability_distance',
        type: 'float',
        nullable: true
    })
    availabilityDistance: number

    @Column({
        name: 'total_earned',
        type: 'float',
        nullable: true
    })
    totalEarned: number

    @Column({
        name: 'is_email_verify',
        type: 'boolean',
        nullable: true,
        default: false
    })
    isEmailVerify: Boolean

    @Column({
        name: 'verify_otp',
        type: 'varchar',
        nullable: true,
        default: null
    })
    verifyOtp: string

    @OneToMany(() => Address, address => address.user, {
        eager: true
    })
    address: Address[];

    @OneToMany(() => Service, service => service.user)
    services: Service[];


    @ManyToOne(() => File, file => file.users, {
        nullable: true,
        eager: true
    })
    @JoinColumn({
        name: 'fk_id_profile_pic',
    })
    profilePicId

    @OneToMany(() => UserSlotCalender, userSlotCalender => userSlotCalender.user)
    userSlotCalenders: UserSlotCalender[];

    @ManyToMany((type) => SlotCalender)
    @JoinTable()
    slotCalenders: SlotCalender[]

    @OneToMany(() => BookService, bookService => bookService.address)
    bookServices: BookService[];

    @ManyToMany((type) => CategoryMaster, {
        eager: true
    })
    @JoinTable()
    categoryMaster: CategoryMaster[]

    @OneToMany(() => Review, review => review.user)
    reviews: Review[];

    @OneToMany(() => Review, review => review.givenByUser)
    gReviews: Review[];

    @OneToMany(() => Payout, payout => payout.clientUser)
    clientPayout: Payout[];

    @OneToMany(() => Payout, payout => payout.clientUser)
    serviceProviderPayout: Payout[];

    @OneToMany(() => InviteProjectMapping, inviteProjectMapping => inviteProjectMapping.user)
    inviteProjectMappings: InviteProjectMapping[];

    @OneToMany(() => Bid, bid => bid.user)
    bids: Bid[];

    @OneToMany(() => CompanyUserMapping, companyUserMapping => companyUserMapping.company)
    companies: CompanyUserMapping[];

    @OneToMany(() => CompanyUserMapping, companyUserMapping => companyUserMapping.teamMember)
    teamMembers: CompanyUserMapping[];

    @OneToMany(() => UserKycDocumentMapping, userKycDocumentMapping => userKycDocumentMapping.user)
    kycDocumentMappings: UserKycDocumentMapping[];

    @OneToMany(() => Support, support => support.raisedBy)
    raisedBys: Support[];

    @OneToMany(() => Saved, saved => saved.service)
    saved: Saved[];

    @OneToMany(() => Notification, notification => notification.user)
    notifications: Notification[];

    @ManyToMany((type) => Skills, {
        eager: true,
    })
    @JoinTable()
    skills: Skills[]

    @OneToMany(() => Device, device => device.user)
    devices: Device[];
}
