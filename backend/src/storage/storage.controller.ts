import { Controller, Get, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { StorageService } from './storage.service';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 }), // 8MB
          new FileTypeValidator({ fileType: 'image/(jpeg|png|webp|gif|avif)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.storageService.uploadFile(file);
  }

  @Get('image')
  @UseGuards(AdminGuard)
  async getStoredImage(@Query('url') url: string, @Res() response: Response) {
    const image = await this.storageService.getStoredImage(url);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, max-age=60');
    return response.send(image.body);
  }
}
