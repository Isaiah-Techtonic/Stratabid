import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  // POST /api/uploads/image  (multipart/form-data, field name "file")
  // Returns { path: "/uploads/<id>.jpg" } for the frontend to attach to a listing.
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, enforced again in service
    }),
  )
  upload(@UploadedFile() file: any) {
    return this.uploads.saveImage(file);
  }
}
