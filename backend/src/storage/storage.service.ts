import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { S3Client, CreateBucketCommand, PutBucketPolicyCommand, PutObjectCommand } from '@aws-sdk/client-s3';

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
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Created bucket "${bucketName}"`);

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

      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Configured public read access on bucket "${bucketName}"`);
    } catch (err) {
      if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
        this.logger.log(`Bucket "${bucketName}" already exists.`);
      } else {
        this.logger.error(`Error initializing bucket "${bucketName}":`, err);
      }
    }
  }

  async uploadFile(file: Express.Multer.File) {
    const bucketName = process.env.MINIO_BUCKET || 'yacheyka-gallery';
    const fileKey = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const publicUrl = `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${bucketName}/${fileKey}`;
    this.logger.log(`Uploaded file to MinIO. Public URL: ${publicUrl}`);

    return {
      url: publicUrl,
      key: fileKey,
    };
  }
}
