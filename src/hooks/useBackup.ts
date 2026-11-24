import { animeRepository } from '../db/anime.repository'
import type { BackupData } from '../types/anime'
import { BackupError, createBackup, parseBackup } from '../utils/backup'

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

const pad = (value: number) => String(value).padStart(2, '0')

/** Exportar e importar la biblioteca y el progreso como un archivo JSON. */
export function useBackup() {
  return {
    async exportBackup(now: Date = new Date()): Promise<{ filename: string; content: string }> {
      const { library, watchedEpisodes } = await animeRepository.exportData()
      const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      return {
        filename: `anime-tracker-respaldo-${date}.json`,
        content: JSON.stringify(createBackup(library, watchedEpisodes, now), null, 2),
      }
    },

    /** Lee y valida el archivo sin modificar nada; lanza BackupError si no es un respaldo válido. */
    async readBackupFile(file: File): Promise<BackupData> {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('El archivo es demasiado grande para ser un respaldo.')
      let json: unknown
      try {
        json = JSON.parse(await file.text())
      } catch {
        throw new BackupError('El archivo no es un JSON válido.')
      }
      return parseBackup(json)
    },

    /** Reemplaza todos los datos locales por los del respaldo ya validado. */
    importBackup: (data: BackupData) => animeRepository.importData(data),
  }
}
