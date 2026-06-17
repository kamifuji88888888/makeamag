import path from 'path'
import { fileURLToPath } from 'url'
import { createLocalStorage } from './local.js'
import { createS3Storage } from './s3.js'
import type { StorageProvider } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

export function createStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'local'

  if (provider === 's3') {
    console.log('Using S3 cloud storage')
    return createS3Storage()
  }

  console.log('Using local filesystem storage')
  return createLocalStorage(DATA_DIR)
}
