"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed z-[100] flex max-h-screen w-[380px] flex-col gap-3 outline-none p-6",
      "top-0 left-1/2 -translate-x-1/2", 
      "max-sm:bottom-0 max-sm:top-auto max-sm:w-full",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  `
  group relative flex items-start gap-4 w-full
  rounded-[1.5rem] p-5 pr-12
  backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)]
  transition-all duration-300 ease-out
  data-[state=open]:animate-in
  data-[state=open]:slide-in-from-top-10
  data-[state=closed]:animate-out
  data-[state=closed]:fade-out-80
  data-[state=closed]:slide-out-to-top-2
`,
  {
    variants: {
      variant: {
        default: "bg-zinc-900/90 border-white/10 text-white",
        success: "bg-zinc-950/90 border-emerald-500/30 text-white shadow-emerald-500/10",
        warning: "bg-zinc-950/90 border-amber-500/30 text-white shadow-amber-500/10",
        destructive: "bg-zinc-950/90 border-rose-500/30 text-white shadow-rose-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  const duration = props.duration ?? 5000

  const Icon = variant === 'destructive' ? AlertCircle 
             : variant === 'success' ? CheckCircle2 
             : variant === 'warning' ? AlertTriangle
             : Info;

  return (
    <ToastPrimitives.Root
      ref={ref}
      duration={duration}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className={cn(
        "mt-0.5 shrink-0 p-2 rounded-xl",
        variant === 'success' && "bg-emerald-500/10 text-emerald-400",
        variant === 'warning' && "bg-amber-500/10 text-amber-400",
        variant === 'destructive' && "bg-rose-500/10 text-rose-400",
        variant === 'default' && "bg-white/5 text-zinc-400"
      )}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        {props.children}
      </div>

      {/* ⏳ Precision Progress bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-[2px] rounded-b-[1.5rem]",
          variant === "success" && "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
          variant === "warning" && "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
          variant === "destructive" && "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
          variant === "default" && "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
        )}
        style={{
          animation: `toast-progress ${duration}ms linear forwards`,
        }}
      />
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition-all",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-black uppercase tracking-widest leading-none", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs font-medium text-zinc-400 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastPrimitives.Action>

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-transparent px-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-rose-500/30 group-[.destructive]:hover:border-rose-500/50 group-[.destructive]:hover:bg-rose-500 group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-rose-500",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  type ToastProps,
  type ToastActionElement,
}
