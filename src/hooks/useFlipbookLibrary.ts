import { useCallback, useEffect, useState } from 'react'
import {
  addLibraryEntry,
  countEntriesForFolder,
  createLibraryFolder,
  deleteDraftPdf,
  getLibraryEntries,
  getLibraryEntriesForFolder,
  getLibraryFolders,
  loadDraftPdf,
  moveEntryToFolder,
  type LibraryEntry,
  type LibraryFolder,
  type LibraryFolderFilter,
  removeLibraryEntry,
  removeLibraryFolder,
  renameLibraryFolder,
  reorderLibrary,
  saveDraftPdf,
  sortLibraryByRecent,
  touchLibraryEntry,
  updateLibraryEntry,
} from '../lib/libraryStorage'

export function useFlipbookLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>(() => getLibraryEntries())
  const [folders, setFolders] = useState<LibraryFolder[]>(() => getLibraryFolders())
  const [activeFolder, setActiveFolder] = useState<LibraryFolderFilter>('all')

  const refresh = useCallback(() => {
    setEntries(getLibraryEntries())
    setFolders(getLibraryFolders())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const visibleEntries = getLibraryEntriesForFolder(activeFolder)

  const addDraft = useCallback(
    async (
      file: File,
      pageCount: number,
      extras?: Pick<
        LibraryEntry,
        | 'publication'
        | 'tableOfContents'
        | 'linkHotspots'
        | 'spreadView'
        | 'branding'
        | 'thumbnail'
        | 'folderId'
      >,
    ) => {
      const id = crypto.randomUUID()
      await saveDraftPdf(id, file)
      const folderId =
        activeFolder !== 'all' && activeFolder !== 'uncategorized' ? activeFolder : null
      const entry = addLibraryEntry({
        id,
        fileName: file.name,
        type: 'draft',
        flipbookId: null,
        pageCount,
        isPasswordProtected: false,
        folderId,
        ...extras,
      })
      refresh()
      return entry
    },
    [activeFolder, refresh],
  )

  const markPublished = useCallback(
    (
      libraryEntryId: string,
      flipbook: {
        id: string
        fileName: string
        isPasswordProtected: boolean
        pageCount?: number
        publication?: LibraryEntry['publication']
        tableOfContents?: LibraryEntry['tableOfContents']
        linkHotspots?: LibraryEntry['linkHotspots']
        spreadView?: boolean
        branding?: LibraryEntry['branding']
        thumbnail?: string
      },
    ) => {
      updateLibraryEntry(libraryEntryId, {
        type: 'published',
        flipbookId: flipbook.id,
        fileName: flipbook.fileName,
        isPasswordProtected: flipbook.isPasswordProtected,
        ...(flipbook.pageCount !== undefined ? { pageCount: flipbook.pageCount } : {}),
        ...(flipbook.publication ? { publication: flipbook.publication } : {}),
        ...(flipbook.tableOfContents ? { tableOfContents: flipbook.tableOfContents } : {}),
        ...(flipbook.linkHotspots ? { linkHotspots: flipbook.linkHotspots } : {}),
        ...(flipbook.spreadView !== undefined ? { spreadView: flipbook.spreadView } : {}),
        ...(flipbook.branding ? { branding: flipbook.branding } : {}),
        ...(flipbook.thumbnail ? { thumbnail: flipbook.thumbnail } : {}),
      })
      void deleteDraftPdf(libraryEntryId)
      refresh()
    },
    [refresh],
  )

  const openDraft = useCallback(async (entry: LibraryEntry) => {
    touchLibraryEntry(entry.id)
    refresh()
    const file = await loadDraftPdf(entry.id, entry.fileName)
    if (!file) {
      removeLibraryEntry(entry.id)
      refresh()
      throw new Error('Draft file no longer available')
    }
    return file
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    const entry = getLibraryEntries().find((e) => e.id === id)
    if (entry?.type === 'draft') {
      await deleteDraftPdf(id)
    }
    removeLibraryEntry(id)
    refresh()
  }, [refresh])

  const reorder = useCallback(
    (order: string[]) => {
      setEntries(reorderLibrary(order))
    },
    [],
  )

  const resetOrderByRecent = useCallback(() => {
    setEntries(sortLibraryByRecent())
  }, [])

  const bumpUpdated = useCallback(
    (id: string, patch?: Partial<LibraryEntry>) => {
      updateLibraryEntry(id, patch ?? {})
      refresh()
    },
    [refresh],
  )

  const createFolder = useCallback(
    (name: string) => {
      const folder = createLibraryFolder(name)
      refresh()
      setActiveFolder(folder.id)
      return folder
    },
    [refresh],
  )

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const folder = renameLibraryFolder(id, name)
      refresh()
      return folder
    },
    [refresh],
  )

  const deleteFolder = useCallback(
    (id: string) => {
      removeLibraryFolder(id)
      setActiveFolder((current) => (current === id ? 'all' : current))
      refresh()
    },
    [refresh],
  )

  const moveToFolder = useCallback(
    (entryId: string, folderId: string | null) => {
      moveEntryToFolder(entryId, folderId)
      refresh()
    },
    [refresh],
  )

  const folderCounts = {
    all: countEntriesForFolder('all'),
    uncategorized: countEntriesForFolder('uncategorized'),
    byFolder: Object.fromEntries(
      getLibraryFolders().map((folder) => [folder.id, countEntriesForFolder(folder.id)]),
    ) as Record<string, number>,
  }

  return {
    entries,
    visibleEntries,
    folders,
    activeFolder,
    setActiveFolder,
    folderCounts,
    addDraft,
    markPublished,
    openDraft,
    remove,
    reorder,
    resetOrderByRecent,
    bumpUpdated,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    refresh,
  }
}
