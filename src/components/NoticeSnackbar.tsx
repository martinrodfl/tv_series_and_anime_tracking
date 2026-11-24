import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { Notice } from '../hooks/useNotice'

interface NoticeSnackbarProps {
  notice: Notice | null
  onClose: () => void
}

export default function NoticeSnackbar({ notice, onClose }: NoticeSnackbarProps) {
  return (
    <Snackbar open={notice !== null} autoHideDuration={4000} onClose={onClose}>
      {notice ? (
        <Alert severity={notice.severity} onClose={onClose} variant="filled">
          {notice.text}
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
