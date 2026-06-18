import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { FlipbookStoredMeta } from '../../shared/flipbook.js'
import type { StorageProvider } from './types.js'

function pdfKey(id: string) {
  return `flipbooks/${id}/document.pdf`
}

function logoKey(id: string) {
  return `flipbooks/${id}/logo`
}

function logoMetaSidecar(id: string) {
  return `flipbooks/${id}/logo-meta.json`
}

function metaKey(id: string) {
  return `flipbooks/${id}/meta.json`
}

export function createS3Storage(): StorageProvider {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is required for S3 storage')
  }

  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
        }
      : undefined,
  })

  const signedUrlTtl = Number(process.env.S3_SIGNED_URL_TTL ?? 3600)

  return {
    async savePdf(id, buffer) {
      const key = pdfKey(id)
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: 'application/pdf',
        }),
      )
      return key
    },

    async readPdf(id) {
      const meta = await this.readMeta(id)
      if (!meta) throw new Error('Flipbook not found')

      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: meta.pdfKey,
        }),
      )

      const bytes = await response.Body?.transformToByteArray()
      if (!bytes) throw new Error('PDF not found in storage')
      return Buffer.from(bytes)
    },

    async getPdfRedirectUrl(id) {
      const meta = await this.readMeta(id)
      if (!meta) return null

      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: meta.pdfKey,
        }),
        { expiresIn: signedUrlTtl },
      )
    },

    async saveMeta(meta) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: metaKey(meta.id),
          Body: JSON.stringify(meta),
          ContentType: 'application/json',
        }),
      )
    },

    async readMeta(id) {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: metaKey(id),
          }),
        )
        const raw = await response.Body?.transformToString()
        if (!raw) return null
        return JSON.parse(raw) as FlipbookStoredMeta
      } catch {
        return null
      }
    },

    async listAllMeta() {
      const metas: FlipbookStoredMeta[] = []
      let continuationToken: string | undefined

      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: 'flipbooks/',
            ContinuationToken: continuationToken,
          }),
        )

        for (const item of response.Contents ?? []) {
          if (!item.Key?.endsWith('/meta.json')) continue
          try {
            const object = await client.send(
              new GetObjectCommand({
                Bucket: bucket,
                Key: item.Key,
              }),
            )
            const raw = await object.Body?.transformToString()
            if (!raw) continue
            metas.push(JSON.parse(raw) as FlipbookStoredMeta)
          } catch {
            // skip unreadable meta objects
          }
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
      } while (continuationToken)

      return metas
    },

    async saveLogo(id, buffer, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: logoKey(id),
          Body: buffer,
          ContentType: contentType,
        }),
      )
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: logoMetaSidecar(id),
          Body: JSON.stringify({ contentType }),
          ContentType: 'application/json',
        }),
      )
      return logoKey(id)
    },

    async readLogo(id) {
      try {
        const metaResponse = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: logoMetaSidecar(id),
          }),
        )
        const metaRaw = await metaResponse.Body?.transformToString()
        if (!metaRaw) return null
        const meta = JSON.parse(metaRaw) as { contentType: string }

        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: logoKey(id),
          }),
        )
        const bytes = await response.Body?.transformToByteArray()
        if (!bytes) return null
        return { buffer: Buffer.from(bytes), contentType: meta.contentType }
      } catch {
        return null
      }
    },

    async deleteLogo(id) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: logoKey(id),
          Body: Buffer.alloc(0),
        }),
      )
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: logoMetaSidecar(id),
          Body: JSON.stringify({ contentType: '' }),
          ContentType: 'application/json',
        }),
      )
    },
  }
}
