import {
  USER_STATUSES,
  type BackupData,
  type LibraryEntry,
  type UserStatus,
  type WatchedEpisode,
} from '../types/anime'
import { MAX_EPISODE_NUMBER } from './progress'

export const BACKUP_APP = 'anime-tracker'
export const BACKUP_VERSION = 1

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

export function createBackup(
  library: LibraryEntry[],
  watchedEpisodes: WatchedEpisode[],
  exportedAt: Date = new Date(),
): BackupData {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), library, watchedEpisodes }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fail = (path: string, expected: string): never => {
  throw new BackupError(`${path}: ${expected}.`)
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  return isRecord(value) ? value : fail(path, 'debe ser un objeto')
}

function readArray(value: unknown, path: string): unknown[] {
  return Array.isArray(value) ? value : fail(path, 'debe ser una lista')
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) return null
  return typeof value === 'string' ? value : fail(path, 'debe ser texto o null')
}

function readInteger(value: unknown, path: string, min: number, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fail(path, `debe ser un entero entre ${min} y ${max}`)
}

function readNullableInteger(value: unknown, path: string, min: number, max: number): number | null {
  return value === null ? null : readInteger(value, path, min, max)
}

function readTimestamp(value: unknown, path: string): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fail(path, 'debe ser una marca de tiempo válida')
}

function readCoverUrl(value: unknown, path: string): string | null {
  const url = readNullableString(value, path)
  return url === null || /^https?:\/\//i.test(url) ? url : fail(path, 'debe ser una URL http(s) o null')
}

function readUserStatus(value: unknown, path: string): UserStatus {
  return USER_STATUSES.find((status) => status === value) ?? fail(path, `debe ser uno de ${USER_STATUSES.join(', ')}`)
}

function parseEntry(raw: unknown, index: number): LibraryEntry {
  const path = `library[${index}]`
  const entry = readRecord(raw, path)
  const title = readRecord(entry.title, `${path}.title`)
  if (typeof entry.favorite !== 'boolean') fail(`${path}.favorite`, 'debe ser verdadero o falso')

  // Se reconstruye el objeto campo a campo: lo desconocido del archivo se descarta.
  return {
    anilistId: readInteger(entry.anilistId, `${path}.anilistId`, 1, Number.MAX_SAFE_INTEGER),
    title: {
      romaji: readNullableString(title.romaji, `${path}.title.romaji`),
      english: readNullableString(title.english, `${path}.title.english`),
    },
    coverUrl: readCoverUrl(entry.coverUrl, `${path}.coverUrl`),
    format: readNullableString(entry.format, `${path}.format`),
    airingStatus: readNullableString(entry.airingStatus, `${path}.airingStatus`),
    episodes: readNullableInteger(entry.episodes, `${path}.episodes`, 1, MAX_EPISODE_NUMBER),
    nextEpisode: readNullableInteger(entry.nextEpisode, `${path}.nextEpisode`, 1, MAX_EPISODE_NUMBER),
    userStatus: readUserStatus(entry.userStatus, `${path}.userStatus`),
    favorite: entry.favorite === true,
    rating: readNullableInteger(entry.rating, `${path}.rating`, 1, 10),
    addedAt: readTimestamp(entry.addedAt, `${path}.addedAt`),
    updatedAt: readTimestamp(entry.updatedAt, `${path}.updatedAt`),
  }
}

function parseWatched(raw: unknown, index: number): WatchedEpisode {
  const path = `watchedEpisodes[${index}]`
  const watched = readRecord(raw, path)
  return {
    anilistId: readInteger(watched.anilistId, `${path}.anilistId`, 1, Number.MAX_SAFE_INTEGER),
    episodeNumber: readInteger(watched.episodeNumber, `${path}.episodeNumber`, 1, MAX_EPISODE_NUMBER),
    watchedAt: readTimestamp(watched.watchedAt, `${path}.watchedAt`),
  }
}

/** Valida un respaldo desconocido; lanza BackupError con el primer problema encontrado. */
export function parseBackup(input: unknown): BackupData {
  const root = isRecord(input) ? input : fail('El archivo', 'debe contener un objeto JSON')
  if (root.app !== BACKUP_APP) fail('app', `debe ser «${BACKUP_APP}»; no parece un respaldo de esta aplicación`)
  if (root.version !== BACKUP_VERSION) {
    fail('version', `no es compatible (se esperaba la versión ${BACKUP_VERSION})`)
  }
  const exportedAt = typeof root.exportedAt === 'string' ? root.exportedAt : fail('exportedAt', 'debe ser texto')

  const library = readArray(root.library, 'library').map(parseEntry)
  const ids = new Set<number>()
  for (const entry of library) {
    if (ids.has(entry.anilistId)) fail('library', `el anime ${entry.anilistId} aparece repetido`)
    ids.add(entry.anilistId)
  }

  const watchedEpisodes = readArray(root.watchedEpisodes, 'watchedEpisodes').map(parseWatched)
  const pairs = new Set<string>()
  for (const watched of watchedEpisodes) {
    if (!ids.has(watched.anilistId)) {
      fail('watchedEpisodes', `hay episodios vistos del anime ${watched.anilistId}, que no está en la biblioteca`)
    }
    const pair = `${watched.anilistId}:${watched.episodeNumber}`
    if (pairs.has(pair)) {
      fail('watchedEpisodes', `el episodio ${watched.episodeNumber} del anime ${watched.anilistId} aparece repetido`)
    }
    pairs.add(pair)
  }

  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, library, watchedEpisodes }
}
