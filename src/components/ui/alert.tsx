import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-white/10 [&>svg]:text-zinc-400",
        destructive:
          "border-rose-500/50 bg-rose-500/5 text-rose-500 [&>svg]:text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
        success:
          "border-emerald-500/50 bg-emerald-500/5 text-emerald-500 [&>svg]:text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
        warning:
          "border-amber-500/50 bg-amber-500/5 text-amber-500 [&>svg]:text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
        info:
          "border-sky-500/50 bg-sky-500/5 text-sky-500 [&>svg]:text-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.1)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, children, ...props }, ref) => {
  const Icon = variant === 'destructive' ? AlertCircle 
             : variant === 'success' ? CheckCircle2 
             : variant === 'warning' ? AlertTriangle
             : variant === 'info' ? Info
             : Info;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-black uppercase tracking-widest text-[10px] leading-none", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs font-medium opacity-90 leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
