import { forwardRef, Inject, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import * as _ from 'underscore';
import { Invoice } from './entities/invoice.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookServiceService } from '../book-service/book-service.service';
import { COST_TYPE, ROLE, TAX_MASTER_STATUS, TAX_TYPE } from 'src/global/enums';
import * as moment from 'moment';
import { BookService } from '../book-service/entities/book-service.entity';
import { FileService } from '../file/file.service';
import { diskNames } from 'src/global/disk-names';
import { NotificationsService } from '../notifications/notifications.service';
import { PDFService } from '@t00nday/nestjs-pdf';
import { firstValueFrom } from 'rxjs';
const fs = require("fs")
const path = require("path")
const ejs = require('ejs');
import * as puppeteer from "puppeteer"

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
    @Inject(BookServiceService) private readonly bookService: BookServiceService,
    @Inject(FileService) private readonly fileService: FileService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService,
    private readonly pdfService: PDFService,
  ) { }
  async create(createInvoiceDto: CreateInvoiceDto) {
    //@TODO add notification
    return this.invoiceRepository.save(createInvoiceDto)
  }

  async uploadImages(files, id: number) {
    try {
      let invoice = await this.invoiceRepository.findOne({ where: { id: id }, relations: ['serviceStartPicture', 'serviceEndPicture'] })
      let serviceStartPictureId: number = invoice.serviceStartPicture;
      let serviceEndPictureId: number = invoice.serviceEndPicture;
      if (files && files.serviceStartPicture && files.serviceStartPicture.length) {
        const file = files.serviceStartPicture[0];
        let fileEntry = await this.fileService.save(file.buffer, diskNames.INVOICE, file.originalname, 3, "0", file.mimetype)
        serviceStartPictureId = fileEntry.id
      }
      if (files && files.serviceEndPicture && files.serviceEndPicture.length) {
        const file = files.serviceEndPicture[0];
        let fileEntry = await this.fileService.save(file.buffer, diskNames.INVOICE, file.originalname, 4, "0", file.mimetype)
        serviceEndPictureId = fileEntry.id
      }
      invoice.serviceStartPicture = { id: serviceStartPictureId };
      invoice.serviceEndPicture = { id: serviceEndPictureId };
      await this.invoiceRepository.save(invoice);
      return {
        success: true
      }
    } catch (err) {
      throw err;
    }
  }

  async generatePDF(html: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"]
    })
    const page = await browser.newPage()
    await page.setContent(html)

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        left: '0px',
        top: '0px',
        right: '0px',
        bottom: '0px'
      }
    })

    await browser.close()

    return buffer
  }


  async downloadInvoice(id: number, res: any) {
    try {
      let invoice = await this.invoiceRepository.findOne({
        where: {
          id: id
        },
        loadEagerRelations: false,
        relations: [
          'bookService',
          'bookService.user',
          'bookService.address',
          'bookService.service',
        ]
      })
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      const endDate = moment(invoice.serviceEndDate).format('Do MMM, YYYY');
      // const durationInHours = moment(invoice.serviceEndDate).diff(invoice.serviceStartDate, 'hours');
      // const durationInMinutes = moment(invoice.serviceEndDate).diff(invoice.serviceStartDate, 'minutes');
      const durationInHours = parseInt((moment(invoice?.serviceEndDate).diff(invoice?.serviceStartDate, "minutes") / 60).toString() || "0") + "hr(s) ";
      const durationInMinutes = parseInt((moment(invoice?.serviceEndDate).diff(invoice?.serviceStartDate, "minutes") % 60).toString() || "0") + "min(s)";
      // const durationInHours = parseInt(moment(invoice?.serviceEndDate).diff(invoice?.serviceStartDate, "minutes") / 60);
      // const durationInMinutes = parseInt(moment(invoice?.serviceEndDate).diff(invoice?.serviceStartDate, "minutes") % 60;
      const address = invoice.bookService.address;
      const uniqueId = invoice.bookService.orderUniqueId;
      const serviceName = invoice.bookService.service.headline;
      const customerName = invoice.bookService.user.firstName + ' ' + invoice.bookService.user.lastName;

      let html = ejs.render(fs.readFileSync(path.resolve(__dirname, '../../../templates/invoice.ejs'), 'utf8'),
        {
          orderUniqueId: uniqueId,
          customerName,
          customerAddress: address.addressLine1 + ',' + (address.addressLine2 ? address.addressLine2 + ',' : '') + (address.addressLine3 ? address.addressLine3 + ',' : '') + (address.postcode ? address.postcode : ''),
          serviceName,
          endDate,
          duration: durationInHours + durationInMinutes,
          // duration: durationInHours ? `${durationInHours} hr(s)` : `${durationInMinutes} min(s)`,
          serviceCost: invoice.serviceCost,
          visitingCharges: invoice.visitingCharges,
          extraCharges: invoice.totalExtraCharges,
          tax: invoice.taxesPayable,
          invoiceTotal: invoice.grandTotal || 0,
          invoiceData: moment(invoice?.updated_at || moment()).format("Do MMM, YYYY h:mm a")
        }, {
        root: process.cwd(),
      })
      const buffer = await this.generatePDF(html)
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=invoice.pdf',
        'Content-Length': buffer.length,

        // prevent cache
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': 0,
      })

      res.end(buffer)

      // let pdfBuffer = await firstValueFrom(this.pdfService.toBuffer('invoice', {
      //   locals: {
      //     orderUniqueId: uniqueId,
      //     customerName,
      //     customerAddress: address.addressLine1 + ',' + (address.addressLine2 ? address.addressLine2 + ',' : '') + (address.addressLine3 ? address.addressLine3 + ',' : '') + (address.postcode ? address.postcode : ''),
      //     serviceName,
      //     endDate,
      //     duration: durationInHours ? `${durationInHours} hr(s)` : `${durationInMinutes} min(s)`,
      //     serviceCost: invoice.totalServiceCost,
      //     visitingCharges: invoice.visitingCharges,
      //     extraCharges: invoice.totalExtraCharges,
      //     tax: invoice.taxesPayable,
      //     invoiceTotal: invoice.grandTotal || 0,
      //     invoiceData: moment(invoice?.updated_at || moment()).format("Do MMM, YYYY h:mm a")
      //   }
      // }));

      // res.end(pdfBuffer);
    } catch (err) {
      throw err;
    }
  }

  findAll() {
    return `This action returns all invoice`;
  }

  async findOne(bookingId: number) {
    try {
      let invoice = await this.invoiceRepository.findOne({
        where: {
          bookService: {
            id: bookingId
          }
        }
      })
      if (invoice) {
        return invoice;
      } else {
        let invoiceCreation = await this.invoiceRepository.create({
          bookService: {
            id: bookingId
          }
        })
        return await this.invoiceRepository.save(invoiceCreation);
      }
    } catch (err) {
      throw err;
    }
  }

  async update(updateInvoiceDto: UpdateInvoiceDto) {
    let { bookServiceId, ...updateInvoice } = updateInvoiceDto;
    // calculate grand total
    // get service cost from booking

    const invoiceDetails = await this.invoiceRepository.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.bookService', 'bookService')
      .leftJoinAndSelect('bookService.user', 'user')
      .leftJoinAndSelect('bookService.service', 'service')
      .leftJoinAndSelect('service.user', 'serviceUser')
      .where({
        bookService: {
          id: bookServiceId,
        }
      })
      .getOne();

    updateInvoice['taxPercentage'] = invoiceDetails.bookService.taxPercentage;
    updateInvoice['taxUniqueCode'] = invoiceDetails.bookService.taxUniqueCode
    // extra cost
    let extraCost: Array<number> = []
    if (updateInvoice.extraCharges) {
      extraCost = _.pluck(updateInvoice.extraCharges, 'cost'); // array of extra cost
    } else if (invoiceDetails.extraCharges && invoiceDetails.extraCharges.length) {
      extraCost = _.pluck(JSON.parse(invoiceDetails.extraCharges || "[]"), 'cost');
    }
    // check service Type
    // hourly 
    let bookService = invoiceDetails.bookService;
    if (bookService.service.costType === COST_TYPE.HOURLY) {
      let hourDifference = 1;
      let serviceDates = {
        start: updateInvoice.serviceStartDate || invoiceDetails.serviceStartDate || null,
        end: updateInvoice.serviceEndDate || invoiceDetails.serviceEndDate || null
      }
      if (serviceDates.end && serviceDates.start) {
        hourDifference = Math.ceil(moment(serviceDates.end).diff(serviceDates.start) / (1000 * 60 * 60));
      }
      let serviceCost = hourDifference * bookService.service.serviceCost;
      let totalExtraCost = extraCost.reduce((accumulator, value) => {
        return accumulator + value;
      }, 0);

      let totalServiceCost = serviceCost + totalExtraCost
      // calculate taxes
      let tax = 0;

      if (invoiceDetails.bookService.taxPercentage) {
        tax = (parseInt(invoiceDetails.bookService.taxPercentage) / 100) * totalServiceCost;
      }

      updateInvoice['serviceCost'] = serviceCost;
      updateInvoice['totalExtraCharges'] = totalExtraCost;
      updateInvoice['totalServiceCost'] = totalServiceCost;
      updateInvoice['taxesPayable'] = tax
      updateInvoice['grandTotal'] = totalServiceCost + tax;

    }
    if (bookService.service.costType === COST_TYPE.FIXED_COST) {
      let serviceCost = bookService.service.serviceCost;

      let totalExtraCost = extraCost.reduce((accumulator, value) => {
        return accumulator + value;
      }, 0);

      let totalServiceCost = serviceCost + totalExtraCost
      // calculate taxes
      let tax = 0;

      if (invoiceDetails.bookService.taxPercentage) {
        tax = (parseInt(invoiceDetails.bookService.taxPercentage) / 100) * totalServiceCost;
      }
      let grandTotal = totalServiceCost + tax;

      updateInvoice['serviceCost'] = serviceCost;
      updateInvoice['totalExtraCharges'] = totalExtraCost;
      updateInvoice['totalServiceCost'] = totalServiceCost;
      updateInvoice['taxesPayable'] = tax
      updateInvoice['grandTotal'] = grandTotal;
    }
    updateInvoice['visitingCharges'] = bookService.service.visitingCharges


    if (updateInvoice.extraCharges) {
      updateInvoice.extraCharges = JSON.stringify(updateInvoice.extraCharges);
    }

    const invoice = await this.invoiceRepository.save({ ...updateInvoice, id: invoiceDetails.id })

    const notificationArray: Array<any> = [];
    if (updateInvoiceDto.arrivedAtLocation) {
      // notification to client
      notificationArray.push({
        userId: bookService.user.id,
        role: ROLE.CLIENT,
        title: `${bookService.service.user.firstName} ${bookService.service.user.lastName} has reached the location.`,
        description: `${bookService.service.user.firstName} ${bookService.service.user.lastName} has reached the location.`,
        serviceId: bookService.service.id + "",
        projectId: null,
        bookServiceId: bookService.id + "",
        config: {
          isTeamMember: true,
          id: bookService.id,
          status: bookService.status,
          type: 'SERVICE'
        }
      })
    }
    if (updateInvoiceDto.serviceStarted) {
      // notification to client
      notificationArray.push({
        userId: bookService.user.id,
        role: ROLE.CLIENT,
        title: `${bookService.service.user.firstName} ${bookService.service.user.lastName} started the work.`,
        description: `${bookService.service.user.firstName} ${bookService.service.user.lastName} started the work.`,
        serviceId: bookService.service.id + "",
        projectId: null,
        bookServiceId: bookService.id + "",
        config: {
          isTeamMember: true,
          id: bookService.id,
          status: bookService.status,
          type: 'SERVICE'
        }
      })
    }
    if (updateInvoiceDto.serviceEnded) {
      // notification to client
      notificationArray.push({
        userId: bookService.user.id,
        role: ROLE.CLIENT,
        title: `The work has been completed by ${bookService.service.user.firstName} ${bookService.service.user.lastName}`,
        description: `The work has been completed by ${bookService.service.user.firstName} ${bookService.service.user.lastName}`,
        serviceId: bookService.service.id + "",
        projectId: null,
        bookServiceId: bookService.id + "",
        config: {
          isTeamMember: true,
          id: bookService.id,
          status: bookService.status,
          type: 'SERVICE'
        }
      })
    }
    await this.notificationsService.createAll(notificationArray)
    return invoice
  }

  remove(id: number) {
    return `This action removes a #${id} invoice`;
  }
}
