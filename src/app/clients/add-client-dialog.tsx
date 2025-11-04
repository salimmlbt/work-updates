
'use client'

import { useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { addClient } from '@/app/actions'
import type { Client, Industry } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropperDialog } from './image-cropper-dialog'

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required.'),
  industry: z.string().min(1, 'Industry is required.'),
  contact: z.string().min(1, 'Contact number is required.'),
  whatsapp: z.string().url('Invalid URL.').optional().or(z.literal('')),
  avatar: z.any().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface AddClientDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onClientAdded: (newClient: Client) => void
  industries: Industry[]
}

export function AddClientDialog({
  isOpen,
  setIsOpen,
  onClientAdded,
  industries,
}: AddClientDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    mode: 'onChange',
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageToCrop(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    // Reset the file input to allow re-selecting the same file
    if (e.target) {
      e.target.value = ''
    }
  }

  const onCropComplete = (croppedImage: File) => {
    setValue('avatar', croppedImage, { shouldValidate: true })
    setAvatarPreview(URL.createObjectURL(croppedImage))
    setImageToCrop(null)
  }

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true)

    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('industry', data.industry)
    formData.append('contact', data.contact)
    if (data.whatsapp) formData.append('whatsapp', data.whatsapp)
    if (data.avatar instanceof File) {
      formData.append('avatar', data.avatar)
    }

    const result = await addClient(formData)
    setIsLoading(false)

    if (result.error) {
      toast({
        title: 'Error adding client',
        description: result.error,
        variant: 'destructive',
      })
    } else if (result.data) {
      toast({
        title: 'Client Added',
        description: 'The new client has been added successfully.',
      })
      onClientAdded(result.data as any)
      setIsOpen(false)
      reset()
      setAvatarPreview(null)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      reset()
      setAvatarPreview(null)
    }
    setIsOpen(open)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Fill in the details for the new client.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                  />
                  <Avatar
                    className="h-24 w-24 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <AvatarImage src={avatarPreview ?? undefined} />
                    <AvatarFallback>
                      <User className="h-12 w-12 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Innovate Corp"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Controller
                  name="industry"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-60">
                          {industries.map((industry) => (
                            <SelectItem key={industry.id} value={industry.name}>
                              {industry.name}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.industry && (
                  <p className="text-sm text-destructive">
                    {errors.industry.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  type="text"
                  placeholder="e.g., +1 234 567 890"
                  {...register('contact')}
                />
                {errors.contact && (
                  <p className="text-sm text-destructive">
                    {errors.contact.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp Link</Label>
                <Input
                  id="whatsapp"
                  placeholder="e.g., https://wa.me/1234567890"
                  {...register('whatsapp')}
                />
                {errors.whatsapp && (
                  <p className="text-sm text-destructive">
                    {errors.whatsapp.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDialogClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !isValid}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Client
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        image={imageToCrop}
        onClose={() => setImageToCrop(null)}
        onCropComplete={onCropComplete}
      />
    </>
  )
}
