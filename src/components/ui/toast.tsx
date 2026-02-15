
"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

/* 📍 Modern Top-Center Positioning */
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed z-[100] flex max-h-screen w-[360px] flex-col gap-3 outline-none",
      "top-6 left-1/2 -translate-x-1/2", // Centered at the top
      "max-sm:bottom-6 max-sm:top-auto", // mobile bottom center fallback
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

/* 🎨 Variants */
const toastVariants = cva(
  `
  group relative flex items-start gap-3 w-full
  rounded-2xl p-4 pr-10
  backdrop-blur-xl border shadow-2xl
  transition-all duration-300 ease-out
  data-[state=open]:animate-in
  data-[state=open]:slide-in-from-top-5
  data-[state=closed]:animate-out
  data-[state=closed]:fade-out-80
`,
  {
    variants: {
      variant: {
        default: "bg-white/95 border-slate-200 text-slate-900",
        success: "bg-emerald-50/95 border-emerald-200 text-emerald-900",
        warning: "bg-amber-50/95 border-amber-200 text-amber-900",
        destructive: "bg-rose-50/95 border-rose-200 text-rose-900",
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

  return (
    <ToastPrimitives.Root
      ref={ref}
      duration={duration}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {/* ⏳ Progress bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-[3px] rounded-b-2xl",
          variant === "success" && "bg-emerald-500",
          variant === "warning" && "bg-amber-500",
          variant === "destructive" && "bg-rose-500",
          variant === "default" && "bg-slate-400"
        )}
        style={{
          animation: `toast-progress ${duration}ms linear forwards`,
        }}
      />
      {props.children}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

/* ❌ Close */
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

/* 🏷 Title */
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

/* 📄 Description */
const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

/* Optional Action */
const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "ml-auto inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-800 transition",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

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
