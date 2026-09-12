import { useCallback, useEffect, useState } from 'react'
import type { FlipbookVisibility } from '../../shared/flipbook'
import {
  addLibraryEntry,
  countEntriesForFolder,
  createLibraryFolder,
  deleteDraftPdf,
  dismissPublishedFlipbook,
  getLibraryEntries,
  getLibraryEntriesForFolder,
  getLibraryFolders,
  loadDraftPdf,
  mergePublishedFlipbooks,
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
  undismissPublishedFlipbook,
  updateLibraryEntry,
} from '../lib/libraryStorage'
import { deleteFlipbook } from '../lib/api'
import { fetchPublishedFlipbooks } from '../lib/authApi'

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
        | 'popUpPanels'
        | 'popUpPanelStyle'
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
        visibility?: FlipbookVisibility
        pageCount?: number
        publication?: LibraryEntry['publication']
        tableOfContents?: LibraryEntry['tableOfContents']
        linkHotspots?: LibraryEntry['linkHotspots']
        popUpPanels?: LibraryEntry['popUpPanels']
        popUpPanelStyle?: LibraryEntry['popUpPanelStyle']
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
        ...(flipbook.visibility ? { visibility: flipbook.visibility } : {}),
        ...(flipbook.pageCount !== undefined ? { pageCount: flipbook.pageCount } : {}),
        ...(flipbook.publication ? { publication: flipbook.publication } : {}),
        ...(flipbook.tableOfContents ? { tableOfContents: flipbook.tableOfContents } : {}),
        ...(flipbook.linkHotspots ? { linkHotspots: flipbook.linkHotspots } : {}),
        ...(flipbook.popUpPanels ? { popUpPanels: flipbook.popUpPanels } : {}),
        ...(flipbook.popUpPanelStyle ? { popUpPanelStyle: flipbook.popUpPanelStyle } : {}),
        ...(flipbook.spreadView !== undefined ? { spreadView: flipbook.spreadView } : {}),
        ...(flipbook.branding ? { branding: flipbook.branding } : {}),
        ...(flipbook.thumbnail ? { thumbnail: flipbook.thumbnail } : {}),
      })
      undismissPublishedFlipbook(flipbook.id)
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
    if (!entry) return

    if (entry.type === 'published' && entry.flipbookId) {
      const ok = window.confirm(
        `Delete “${entry.fileName}” permanently?\n\nThis removes it from My flipbooks and deletes the published magazine. The share link will stop working.`,
      )
      if (!ok) return

      try {
        await deleteFlipbook(entry.flipbookId)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete magazine'
        // Still hide locally if the server copy is already gone.
        if (!/not found/i.test(message)) {
          alert(message)
          return
        }
      }
      dismissPublishedFlipbook(entry.flipbookId)
    } else if (entry.type === 'draft') {
      const ok = window.confirm(`Remove draft “${entry.fileName}” from My flipbooks?`)
      if (!ok) return
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

  const syncFromAccount = useCallback(async () => {
    const flipbooks = await fetchPublishedFlipbooks()
    setEntries(mergePublishedFlipbooks(flipbooks))
    setFolders(getLibraryFolders())
  }, [])

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
    syncFromAccount,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    refresh,
  }
}
