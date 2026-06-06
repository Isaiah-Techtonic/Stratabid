import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_BYTES = 10 * 1024 * 1024;       // 10MB hard limit
const COMPRESS_OVER = 5 * 1024 * 1024;    // compress if larger than 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class UploadsService {
  // Accepts a single uploaded file (from multer memory storage), returns its public path.
  async saveImage(file: any): Promise<{ path: string }> {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, or WebP images are allowed');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Image exceeds the 10MB limit');
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const id = randomUUID();
    const outName = `${id}.jpg`;
    const outPath = path.join(UPLOAD_DIR, outName);

    if (file.size > COMPRESS_OVER) {
      // Over 5MB → downscale + compress to lean web size
      await sharp(file.buffer)
        .rotate() // honor EXIF orientation
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outPath);
    } else {
      // Under 5MB → still normalize to jpeg + fix orientation, but keep quality high
      await sharp(file.buffer)
        .rotate()
        .jpeg({ quality: 92 })
        .toFile(outPath);
    }

    // Public URL path (served by nginx from the uploads volume)
    return { path: `/uploads/${outName}` };
  }
}
