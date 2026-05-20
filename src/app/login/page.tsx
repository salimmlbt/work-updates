'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTransition, useState } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { login } from './actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/icons'

const loginSchema = z.object({
  email: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', data.email)
      formData.append('password', data.password)
      
      const result = await login(formData)
      
      if (result?.error) {
        toast({
          title: 'Login Failed',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0f0f0f] overflow-hidden font-sans p-4">
      {/* 🌌 Animated Background Mesh Grains */}
      <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* 💎 Glass Card */}
      <Card className="relative z-10 w-full max-w-md border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 opacity-50" />
        
        <CardHeader className="text-center pt-10 pb-6">
            <div className="flex flex-col items-center gap-4 mb-2">
               <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-violet-600 shadow-[0_0_30px_rgba(56,189,248,0.4)]">
                 <div className="absolute inset-0 rounded-2xl bg-white/10" />
                 <Logo className="relative z-10 h-10 w-10 text-white" />
               </div>
               <div className="space-y-1">
                    <div className="text-3xl font-black tracking-[0.25em] text-white">FALAQ</div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Work Updates Portal</div>
                </div>
            </div>
          <CardDescription className="text-slate-500">Sign in with your workspace credentials</CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Username</Label>
              <div className="flex items-center group">
                <Input
                  id="email"
                  type="text"
                  placeholder="your.name"
                  className={cn(
                    "bg-white/[0.03] border-white/10 text-white h-12 rounded-xl focus-visible:ring-sky-500/50 rounded-r-none transition-all",
                    errors.email && "border-rose-500/50"
                  )}
                  {...register('email')}
                />
                <span className="inline-flex h-12 items-center rounded-r-xl border border-l-0 border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-slate-400">
                  @falaq.com
                </span>
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-rose-400 mt-1 ml-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" university-title="true" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Password</Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn(
                    "bg-white/[0.03] border-white/10 text-white h-12 rounded-xl focus-visible:ring-sky-500/50 transition-all pr-12",
                    errors.password && "border-rose-500/50"
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium text-rose-400 mt-1 ml-1">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all active:scale-[0.98]" 
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In to Dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* 🚀 Footer Quote or Version */}
      <div className="absolute bottom-8 text-center w-full">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Powered by Falaq Studio • v1.2.0</p>
      </div>
    </div>
  )
}
