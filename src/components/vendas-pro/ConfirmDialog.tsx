import { LoaderCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[440px] border-[#e2e8f0] bg-white p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px] font-semibold text-[#1e293b]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[12px] text-[#64748b] leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            disabled={loading}
            className="h-8 border-[#e2e8f0] text-[12px] text-[#475569] hover:bg-[#f8fafc]"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className={
              destructive
                ? 'h-8 bg-rose-600 text-[12px] font-medium text-white hover:bg-rose-700'
                : 'h-8 bg-amber-600 text-[12px] font-medium text-white hover:bg-amber-700'
            }
          >
            {loading && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
