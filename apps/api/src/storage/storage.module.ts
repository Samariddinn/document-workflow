import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './storage.constants.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
    providers: [
        {
            provide: S3_CLIENT,
            useFactory: () => {
                const endpoint = process.env.S3_ENDPOINT;
                const region = process.env.S3_REGION;
                const accessKeyId = process.env.S3_ACCESS_KEY;
                const secretAccessKey = process.env.S3_SECRET_KEY;

                if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
                    throw new Error('S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY and S3_SECRET_KEY must be set');
                }

                return new S3Client({
                    endpoint,
                    region,
                    credentials: { accessKeyId, secretAccessKey },
                    // MinIO serves buckets as http://host/bucket, not http://bucket.host
                    forcePathStyle: true,
                });
            },
        },
        StorageService,
    ],
    exports: [StorageService],
})
export class StorageModule implements OnApplicationShutdown {
    @Inject(S3_CLIENT) private readonly _client: S3Client;

    onApplicationShutdown() {
        this._client.destroy();
    }
}
