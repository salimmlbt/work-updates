import { Logo } from '@/components/icons'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary text-primary-foreground h-20 w-20 rounded-2xl flex items-center justify-center animate-pulse">
            <Logo className="h-12 w-12 text-white" />
        </div>
      </div>
    </div>
  )
}
