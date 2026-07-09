import { BadRequestException, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { S3Client, CreateBucketCommand, GetObjectCommand, PutBucketPolicyCommand, PutObjectCommand } from '@aws-sdk/client-s3';
const FILE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const createSafeObjectKey = (file: Express.Multer.File) => {
  const extension = FILE_EXTENSION_BY_MIME_TYPE[file.mimetype] || 'bin';
  const baseName = file.originalname
    .replace(/\.[^/.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48) || 'image';

  return `uploads/${Date.now()}-${baseName}.${extension}`;
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;

  onModuleInit() {
    this.s3Client = new S3Client({
      endpoint: `http://${process.env.MINIO_ENDPOINT || 'minio'}:${process.env.MINIO_PORT || '9000'}`,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      region: 'us-east-1',
      forcePathStyle: true, // Necessary for MinIO compatibility
    });

    this.initializeBucket();
  }

  private async initializeBucket() {
    const bucketName = process.env.MINIO_BUCKET || 'yacheyka-gallery';
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Created bucket "${bucketName}"`);
    } catch (err) {
      if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
        this.logger.log(`Bucket "${bucketName}" already exists.`);
      } else {
        this.logger.error(`Error initializing bucket "${bucketName}":`, err);
        return;
      }
    }

    try {
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Configured public read access on bucket "${bucketName}"`);
    } catch (err) {
      this.logger.error(`Error configuring public read access on bucket "${bucketName}":`, err);
    }
  }

  async uploadFile(file: Express.Multer.File) {
    const bucketName = process.env.MINIO_BUCKET || 'yacheyka-gallery';
    const fileKey = createSafeObjectKey(file);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: Buffer.from(file.originalname, 'utf8').toString('base64'),
        },
      }),
    );

    const publicUrl = `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${bucketName}/${fileKey}`;
    this.logger.log(`Uploaded file to MinIO. Public URL: ${publicUrl}`);

    return {
      url: publicUrl,
      key: fileKey,
    };
  }

  async getStoredImage(urlValue: string) {
    const bucketName = process.env.MINIO_BUCKET || 'yacheyka-gallery';
    const publicUrl = new URL(process.env.MINIO_PUBLIC_URL || 'http://localhost:9000');
    let requestedUrl: URL;

    try {
      requestedUrl = new URL(urlValue);
    } catch {
      throw new BadRequestException('Invalid image URL');
    }

    const publicPath = publicUrl.pathname.replace(/\/+$/, '');
    const prefix = `${publicPath}/${bucketName}/`.replace(/\/+/g, '/');
    if (requestedUrl.origin !== publicUrl.origin || !requestedUrl.pathname.startsWith(prefix)) {
      throw new BadRequestException('Only project storage images can be cropped');
    }

    const key = decodeURIComponent(requestedUrl.pathname.slice(prefix.length));
    if (!key || key.includes('..')) throw new BadRequestException('Invalid storage key');

    const object = await this.s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    return {
      contentType: object.ContentType || 'application/octet-stream',
      body: Buffer.from(await object.Body.transformToByteArray()),
    };
  }
}
