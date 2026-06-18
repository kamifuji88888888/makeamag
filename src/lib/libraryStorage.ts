import type {
  BrandingConfig,
  LeadCaptureConfig,
  LinkHotspot,
  MonetizationConfig,
  PublicationInfo,
  TocEntry,
} from '../../shared/flipbook'

const LIBRARY_KEY = 'makeamag_library'
const DB_NAME = 'makeamag_drafts'
const DB_VERSION = 1
const PDF_STORE = 'pdfs'

interface StoredDraftPdf {
  name: string
  type: string
  data: ArrayBuffer
}

function isStoredDraftPdf(value: unknown): value is StoredDraftPdf {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    value.data instanceof ArrayBuffer &&
    'name' in value &&
    typeof value.name === 'string'
  )
}

function fileFromStoredDraft(value: unknown, fallbackName: string): File | null {
  if (value instanceof File) {
    return value
  }
  if (value instanceof Blob) {
    return new File([value], fallbackName, { type: value.type || 'application/pdf' })
  }
  if (value instanceof ArrayBuffer) {
    return new File([value], fallbackName, { type: 'application/pdf' })
  }
  if (isStoredDraftPdf(value)) {
    return new File([value.data], value.name || fallbackName, {
      type: value.type || 'application/pdf',
    })
  }
  return null
}

export interface LibraryFolder {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface LibraryEntry {
  id: string
  fileName: string
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
  type: 'draft' | 'published'
  flipbookId: string | null
  pageCount: number
  isPasswordProtected: boolean
  folderId?: string | null
  publication?: PublicationInfo
  tableOfContents?: TocEntry[]
  linkHotspots?: LinkHotspot[]
  spreadView?: boolean
  branding?: BrandingConfig
  monetization?: MonetizationConfig
  leadCapture?: LeadCaptureConfig
  thumbnail?: string
}

interface LibraryData {
  order: string[]
  entries: Record<string, LibraryEntry>
  folders: Record<string, LibraryFolder>
  folderOrder: string[]
}

export type LibraryFolderFilter = 'all' | 'uncategorized' | string

function emptyLibrary(): LibraryData {
  return { order: [], entries: {}, folders: {}, folderOrder: [] }
}

function normalizeLibrary(raw: Partial<LibraryData> | null | undefined): LibraryData {
  if (!raw || typeof raw !== 'object') return emptyLibrary()

  const entries: Record<string, LibraryEntry> = {}
  for (const [id, entry] of Object.entries(raw.entries ?? {})) {
    entries[id] = {
      ...entry,
      folderId: entry.folderId ?? null,
    }
  }

  return {
    order: raw.order ?? [],
    entries,
    folders: raw.folders ?? {},
    folderOrder: raw.folderOrder ?? [],
  }
}

function readLibrary(): LibraryData {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) return emptyLibrary()
    return normalizeLibrary(JSON.parse(raw) as Partial<LibraryData>)
  } catch {
    return emptyLibrary()
  }
}

function writeLibrary(data: LibraryData) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(data))
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(PDF_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open draft storage'))
  })
}

export async function saveDraftPdf(id: string, file: File): Promise<void> {
  const data = await file.arrayBuffer()
  const record: StoredDraftPdf = {
    name: file.name,
    type: file.type || 'application/pdf',
    data,
  }
  const db = await openDraftDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readwrite')
    tx.objectStore(PDF_STORE).put(record, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save draft PDF'))
  })
  db.close()
}

export async function loadDraftPdf(id: string, fallbackName = 'draft.pdf'): Promise<File | null> {
  const db = await openDraftDb()
  const stored = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readonly')
    const request = tx.objectStore(PDF_STORE).get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to load draft PDF'))
  })
  db.close()
  if (!stored) return null
  return fileFromStoredDraft(stored, fallbackName)
}

export async function deleteDraftPdf(id: string): Promise<void> {
  const db = await openDraftDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, 'readwrite')
    tx.objectStore(PDF_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete draft PDF'))
  })
  db.close()
}

export function getLibraryEntries(): LibraryEntry[] {
  const data = readLibrary()
  return data.order
    .map((id) => data.entries[id])
    .filter((entry): entry is LibraryEntry => Boolean(entry))
}

export function getLibraryFolders(): LibraryFolder[] {
  const data = readLibrary()
  return data.folderOrder
    .map((id) => data.folders[id])
    .filter((folder): folder is LibraryFolder => Boolean(folder))
}

export function getLibraryEntriesForFolder(filter: LibraryFolderFilter): LibraryEntry[] {
  const entries = getLibraryEntries()
  if (filter === 'all') return entries
  if (filter === 'uncategorized') {
    return entries.filter((entry) => !entry.folderId)
  }
  return entries.filter((entry) => entry.folderId === filter)
}

export function countEntriesForFolder(filter: LibraryFolderFilter): number {
  return getLibraryEntriesForFolder(filter).length
}

export function addLibraryEntry(
  entry: Omit<LibraryEntry, 'createdAt' | 'updatedAt' | 'lastOpenedAt'> &
    Partial<Pick<LibraryEntry, 'createdAt' | 'updatedAt' | 'lastOpenedAt' | 'folderId'>>,
): LibraryEntry {
  const now = new Date().toISOString()
  const full: LibraryEntry = {
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    folderId: entry.folderId ?? null,
    ...entry,
  }

  const data = readLibrary()
  data.entries[full.id] = full
  data.order = [full.id, ...data.order.filter((id) => id !== full.id)]
  writeLibrary(data)
  return full
}

export function updateLibraryEntry(
  id: string,
  patch: Partial<Omit<LibraryEntry, 'id'>>,
): LibraryEntry | null {
  const data = readLibrary()
  const existing = data.entries[id]
  if (!existing) return null

  const updated: LibraryEntry = {
    ...existing,
    ...patch,
    id,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  }
  data.entries[id] = updated
  writeLibrary(data)
  return updated
}

export function touchLibraryEntry(id: string): void {
  updateLibraryEntry(id, { lastOpenedAt: new Date().toISOString() })
}

export function reorderLibrary(order: string[]): LibraryEntry[] {
  const data = readLibrary()
  const valid = order.filter((id) => data.entries[id])
  const missing = data.order.filter((id) => !valid.includes(id))
  data.order = [...valid, ...missing]
  writeLibrary(data)
  return getLibraryEntries()
}

export function removeLibraryEntry(id: string): void {
  const data = readLibrary()
  delete data.entries[id]
  data.order = data.order.filter((entryId) => entryId !== id)
  writeLibrary(data)
}

export function sortLibraryByRecent(): LibraryEntry[] {
  const data = readLibrary()
  data.order.sort((a, b) => {
    const ea = data.entries[a]
    const eb = data.entries[b]
    if (!ea || !eb) return 0
    return new Date(eb.updatedAt).getTime() - new Date(ea.updatedAt).getTime()
  })
  writeLibrary(data)
  return getLibraryEntries()
}

export function createLibraryFolder(name: string): LibraryFolder {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Folder name is required')
  }

  const data = readLibrary()
  const now = new Date().toISOString()
  const folder: LibraryFolder = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  }

  data.folders[folder.id] = folder
  data.folderOrder = [folder.id, ...data.folderOrder.filter((id) => id !== folder.id)]
  writeLibrary(data)
  return folder
}

export function renameLibraryFolder(id: string, name: string): LibraryFolder | null {
  const trimmed = name.trim()
  if (!trimmed) return null

  const data = readLibrary()
  const folder = data.folders[id]
  if (!folder) return null

  const updated: LibraryFolder = {
    ...folder,
    name: trimmed,
    updatedAt: new Date().toISOString(),
  }
  data.folders[id] = updated
  writeLibrary(data)
  return updated
}

export function removeLibraryFolder(id: string): void {
  const data = readLibrary()
  if (!data.folders[id]) return

  delete data.folders[id]
  data.folderOrder = data.folderOrder.filter((folderId) => folderId !== id)

  for (const entry of Object.values(data.entries)) {
    if (entry.folderId === id) {
      entry.folderId = null
    }
  }

  writeLibrary(data)
}

export function moveEntryToFolder(entryId: string, folderId: string | null): LibraryEntry | null {
  const data = readLibrary()
  const entry = data.entries[entryId]
  if (!entry) return null

  if (folderId && !data.folders[folderId]) {
    throw new Error('Folder not found')
  }

  return updateLibraryEntry(entryId, { folderId })
}

export function reorderLibraryFolders(order: string[]): LibraryFolder[] {
  const data = readLibrary()
  const valid = order.filter((id) => data.folders[id])
  const missing = data.folderOrder.filter((id) => !valid.includes(id))
  data.folderOrder = [...valid, ...missing]
  writeLibrary(data)
  return getLibraryFolders()
}
