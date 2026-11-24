import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { useRef, useState, type ChangeEvent } from 'react'
import { useBackup } from '../hooks/useBackup'
import type { BackupData } from '../types/anime'
import { BackupError } from '../utils/backup'
import { downloadTextFile } from '../utils/download'

interface BackupPanelProps {
  /** Datos locales actuales, para avisar de lo que reemplazará una importación. */
  currentAnime: number
  currentEpisodes: number
}

interface Notice {
  severity: 'success' | 'error'
  text: string
}

const plural = (count: number | undefined, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export default function BackupPanel({ currentAnime, currentEpisodes }: BackupPanelProps) {
  const { exportBackup, readBackupFile, importBackup } = useBackup()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupData | null>(null)
  // El diálogo se cierra con animación: los datos pendientes se conservan hasta entonces.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleExport = async () => {
    try {
      const { filename, content } = await exportBackup()
      downloadTextFile(filename, content)
      setNotice({ severity: 'success', text: 'Copia de seguridad exportada.' })
    } catch {
      setNotice({ severity: 'error', text: 'No se pudo exportar la copia de seguridad.' })
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Permite volver a elegir el mismo archivo más tarde.
    event.target.value = ''
    if (!file) return
    setImportError(null)
    try {
      setPending(await readBackupFile(file))
      setConfirmOpen(true)
    } catch (error) {
      setImportError(error instanceof BackupError ? error.message : 'No se pudo leer el archivo.')
    }
  }

  const handleConfirmImport = async () => {
    setConfirmOpen(false)
    if (!pending) return
    try {
      await importBackup(pending)
      setNotice({ severity: 'success', text: 'Copia de seguridad importada.' })
    } catch {
      setNotice({ severity: 'error', text: 'No se pudo importar; tus datos actuales no se modificaron.' })
    }
  }

  return (
    <Paper variant="outlined" component="section" aria-labelledby="backup-heading" sx={{ p: 2, mt: 4 }}>
      <Typography variant="h6" component="h2" id="backup-heading" gutterBottom>
        Copia de seguridad
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Tus datos solo están en este navegador. Exporta un archivo JSON para guardarlos o moverlos a otro equipo.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant="outlined" onClick={() => void handleExport()}>
          Exportar
        </Button>
        <Button variant="outlined" onClick={() => fileInput.current?.click()}>
          Importar
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Archivo de copia de seguridad"
          onChange={(event) => void handleFileChange(event)}
        />
      </Box>

      {importError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setImportError(null)}>
          No se importó nada. {importError}
        </Alert>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="import-dialog-title">
        <DialogTitle id="import-dialog-title">¿Reemplazar tus datos?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            El archivo contiene {pending?.library.length} anime y{' '}
            {plural(pending?.watchedEpisodes.length, 'episodio visto', 'episodios vistos')}. Al importarlo se
            reemplazarán por completo tus datos actuales ({currentAnime} anime y{' '}
            {plural(currentEpisodes, 'episodio visto', 'episodios vistos')}). Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={() => void handleConfirmImport()}>
            Reemplazar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice !== null} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Paper>
  )
}
