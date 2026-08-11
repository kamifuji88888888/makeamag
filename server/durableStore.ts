import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import fs from 'fs/promises'
import path from 'path'

/** Small JSON/text blobs that must survive Railway deploys (users, billing, aliases, etc.). */
export interface DurableStore {
  readText(key: string): Promise<string | null>
  writeText(key: string, value: string): Promise<void>
  list(prefix: string): Promise<string[]>
}

async function walkLocal(rootDir: string, prefix: string): Promise<string[]> {
  const keys: string[] = []
  const startDir = path.join(rootDir, prefix)

  async function walk(dir: string) {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile()) {
        keys.push(path.relative(rootDir, full).split(path.sep).join('/'))
      }
    }
  }

  await walk(startDir)
  return keys
}

function createLocalDurableStore(rootDir: string): DurableStore {
  return {
    async readText(key) {
      try {
        return await fs.readFile(path.join(rootDir, key), 'utf-8')
      } catch {
        return null
      }
    },

    async writeText(key, value) {
      const fullPath = path.join(rootDir, key)
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, value)
    },

    async list(prefix) {
      return walkLocal(rootDir, prefix)
    },
  }
}

function createS3DurableStore(): DurableStore {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error('S3_BUCKET is required when STORAGE_PROVIDER=s3')
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

  const rootPrefix = (process.env.S3_APP_DATA_PREFIX ?? 'app-data').replace(/\/$/, '')

  function objectKey(key: string) {
    return `${rootPrefix}/${key.replace(/^\//, '')}`
  }

  return {
    async readText(key) {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: objectKey(key),
          }),
        )
        const text = await response.Body?.transformToString()
        return text ?? null
      } catch (error) {
        const name = error instanceof Error ? error.name : ''
        if (name === 'NoSuchKey' || name === 'NotFound') return null
        const meta = error as { $metadata?: { httpStatusCode?: number } }
        if (meta.$metadata?.httpStatusCode === 404) return null
        throw error
      }
    },

    async writeText(key, value) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey(key),
          Body: value,
          ContentType: 'application/json',
        }),
      )
    },

    async list(prefix) {
      const fullPrefix = objectKey(prefix)
      const keys: string[] = []
      let continuationToken: string | undefined

      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: fullPrefix,
            ContinuationToken: continuationToken,
          }),
        )
        for (const item of response.Contents ?? []) {
          if (!item.Key || item.Key.endsWith('/')) continue
          keys.push(item.Key.slice(rootPrefix.length + 1))
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
      } while (continuationToken)

      return keys
    },
  }
}

let sharedStore: DurableStore | null = null

export function getDurableStore(localRoot: string): DurableStore {
  if (!sharedStore) {
    const provider = process.env.STORAGE_PROVIDER ?? 'local'
    sharedStore =
      provider === 's3' ? createS3DurableStore() : createLocalDurableStore(localRoot)
    console.log(
      provider === 's3'
        ? 'Using S3 durable app-data store'
        : `Using local durable app-data store at ${localRoot}`,
    )
  }
  return sharedStore
}
