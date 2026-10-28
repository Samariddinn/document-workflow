import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    NoSuchKey,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { S3_CLIENT } from './storage.constants.js';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly _bucket: string;

    constructor(@Inject(S3_CLIENT) private readonly _client: S3Client) {
        const bucket = process.env.S3_BUCKET;
        if (!bucket) {
            throw new Error('S3_BUCKET is not set');
        }

        this._bucket = bucket;
    }

    // Fail at startup if MinIO is down or the bucket doesn't exist, instead of on the first upload
    async onModuleInit() {
        try {
            await this._client.send(new HeadBucketCommand({ Bucket: this._bucket }));
        } catch (error) {
            throw new Error(`S3 bucket '${this._bucket}' is not reachable`, { cause: error });
        }
    }

    async uploadStream(key: string, body: Readable, mimeType: string, signal?: AbortSignal) {
    const upload = new Upload({
        client: this._client,
        params: { Bucket: this._bucket, Key: key, Body: body, ContentType: mimeType },
        queueSize: 2,               // parts uploaded in parallel
        partSize: 5 * 1024 * 1024,  // 5 MB, the S3 minimum
        leavePartsOnError: false,   // on failure, abort and clean up the parts
    });

    signal?.addEventListener('abort', () => upload.abort());

    await upload.done();
}

    async upload(key: string, body: Buffer, mimeType: string) {
        await this._client.send(
            new PutObjectCommand({ Bucket: this._bucket, Key: key, Body: body, ContentType: mimeType }),
        );
    }

    async getStream(key: string): Promise<Readable> {
        try {
            const result = await this._client.send(new GetObjectCommand({ Bucket: this._bucket, Key: key }));
            return result.Body as Readable;
        } catch (error) {
            if (error instanceof NoSuchKey) {
                throw new NotFoundException('File not found');
            }
            throw error;
        }
    }

    async delete(key: string) {
        await this._client.send(new DeleteObjectCommand({ Bucket: this._bucket, Key: key }));
    }
}
