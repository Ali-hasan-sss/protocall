import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storage } from '@squareboat/nest-storage';
import { extname } from 'path';
import { File } from './entities/file.entity';
import { diskNames } from 'src/global/disk-names';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File) private fileRepository: Repository<File>,
  ) { }

  async save(buffer: Buffer, diskName: string, originalName: string, documentTypeId: number, size: string, mimeType: string) {
    try {
      // generating a unique name for the file
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

      // storing the file to respective disk
      let storage = await Storage.disk(diskName).put(`${randomName}${extname(originalName)}`, buffer) as any

      let url = await Storage.disk(diskName).url(`${randomName}${extname(originalName)}`);
      // creating an entry to the file table
      let fileToSave = await this.fileRepository.create({
        originalFileName: originalName,
        name: randomName,
        size: size,
        mimetype: mimeType,
        diskName: diskName,
        path: (process.env.NODE_ENV === 'staging' && url) ? url : storage.path,
        extension: extname(originalName),
        documentType: { id: documentTypeId }
      })

      // adding an entry to the file table and returning the file object.
      return await this.fileRepository.save(fileToSave);
    } catch (err) {
      throw err
    }
  }

  async delete(id: number) {
    try {
      return await this.fileRepository.softDelete({
        id: id
      })
    } catch (err) {
      throw err;
    }
  }

  async upload(files) {
    try {
      if (files && files.image && files.image.length) {
        const file = files.image[0];
        let fileEntry = await this.save(file.buffer, diskNames.EXTRA, file.originalname, 3, "0", file.mimetype)
        return {
          id: fileEntry.id,
          name: fileEntry.name,
          originalFileName: fileEntry.originalFileName,
          type: fileEntry.extension
        }
      }
    } catch (err) {
      throw err;
    }
  }
  async fetch(id: number, res: any) {
    try {
      // @TODO fetch user authorization checks
      let file = await this.fileRepository.findOne({
        where: {
          id: id
        }
      })
      if (file.path.includes('https://')) {
        let contentType = 'application';
        if (file.extension.replace('.', '').toLowerCase() === 'jpeg' ||
          file.extension.replace('.', '').toLowerCase() === 'png' ||
          file.extension.replace('.', '').toLowerCase() === 'pdf' ||
          file.extension.replace('.', '').toLowerCase() === 'jpg' ||
          file.extension.replace('.', '').toLowerCase() === 'webp') {
          contentType = 'image'
        }
        res.set({
          'Content-Type': contentType + "/" + file.extension.replace('.', ''),
          'Content-Disposition': 'attachment; filename=' + file.name + file.extension,
          "Access-Control-Expose-Headers": "Content-Disposition"
        });
        return res.send(await Storage.disk(file.diskName).get(file.name + file.extension))
      } else {
        return res.sendFile(file.path);
      }
    } catch (err) {
      throw err
    }
  }
}
