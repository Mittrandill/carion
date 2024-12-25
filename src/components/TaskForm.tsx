'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CarIcon, TagIcon, TypeIcon, AlignLeftIcon, Loader2, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { tr } from 'date-fns/locale'
import { Calendar } from "@/components/ui/calendar"
import { useNavigate } from 'react-router-dom'

const taskTags = [
  { id: 'servis', name: 'Servis/Bakım', color: 'bg-blue-500' },
  { id: 'egzoz', name: 'Egzoz Emisyon Ölçümü', color: 'bg-green-500' },
  { id: 'vize', name: 'Vize/Muayene', color: 'bg-yellow-500' },
  { id: 'sigorta', name: 'Sigorta Yenileme', color: 'bg-purple-500' },
  { id: 'lastik', name: 'Lastik Değişimi', color: 'bg-red-500' },
]

interface Vehicle {
  id: number
  plate: string
}

interface TaskFormProps {
  onSave: (task: any) => Promise<void>
  onCancel: () => void
  initialDate: Date | null
  vehicles: Vehicle[]
}

export default function TaskForm({ onSave, onCancel, initialDate, vehicles }: TaskFormProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    date: initialDate ? initialDate.toISOString() : '',
    tag: '',
    vehicleid: 0,
    vehiclePlate: '',
    createdby: '',
    user_id: '',
  })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])

  useEffect(() => {
    fetchUserSession()
  }, [])

  const fetchUserSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error fetching user session:', error)
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu alınamadı.",
        variant: "destructive",
      })
      navigate('/login')
      return
    }
    if (session?.user) {
      setUserId(session.user.id)
      setNewTask(prevTask => ({ ...prevTask, createdby: session.user.id, user_id: session.user.id }))
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      navigate('/login')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      // Validate form fields
      if (!newTask.title || !newTask.date || !newTask.tag || !newTask.vehicleid) {
        throw new Error("Lütfen tüm gerekli alanları doldurun.")
      }

      // Save the task
      await onSave({ ...newTask, user_id: userId })

      // Show success message
      toast({
        title: "Görev eklendi",
        description: "Yeni görev başarıyla eklendi.",
      })

      // Close the form
      onCancel()
    } catch (error) {
      console.error('Error saving task:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Görev eklenirken bir hata oluştu.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderFormField = (icon: React.ReactNode, component: React.ReactNode, label: string) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
        {component}
      </div>
    </div>
  )

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Ajandaya Görev Ekle</DialogTitle>
          <DialogDescription>
            Yeni bir görev eklemek için aşağıdaki formu doldurun.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {renderFormField(
            <CarIcon className="h-5 w-5 text-gray-400" />,
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                <Input
                  id="vehicleSearch"
                  name="vehicleSearch"
                  value={newTask.vehiclePlate || ''}
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase()
                    setNewTask(prev => ({ ...prev, vehiclePlate: e.target.value, vehicleid: 0 }))
                    const filtered = vehicles.filter(vehicle =>
                      vehicle.plate.toLowerCase().includes(searchTerm)
                    )
                    setFilteredVehicles(filtered)
                  }}
                  className="pl-8"
                  placeholder="Araç plakası ara"
                />
              </div>
              {newTask.vehiclePlate && !newTask.vehicleid && (
                <ul className="absolute z-50 w-full mt-1 max-h-32 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
                  {filteredVehicles.map((vehicle) => (
                    <li
                      key={vehicle.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setNewTask(prev => ({
                          ...prev,
                          vehicleid: vehicle.id,
                          vehiclePlate: vehicle.plate,
                        }))
                        setFilteredVehicles([])
                      }}
                    >
                      {vehicle.plate}
                    </li>
                  ))}
                </ul>
              )}
            </div>,
            "Araç"
          )}

          {renderFormField(
            <CalendarIcon className="h-5 w-5 text-gray-400" />,
            <Input
              type="date"
              className="pl-10"
              value={newTask.date ? newTask.date.split('T')[0] : ''}
              onChange={(e) => setNewTask({ ...newTask, date: new Date(e.target.value).toISOString() })}
            />,
            "Tarih"
          )}

          {renderFormField(
            <TagIcon className="h-5 w-5 text-gray-400" />,
            <Select onValueChange={(value) => setNewTask({ ...newTask, tag: value })}>
              <SelectTrigger className="pl-10 w-full">
                <SelectValue placeholder="Görev tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                {taskTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${tag.color}`}></span>
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>,
            "Görev Tipi"
          )}

          {renderFormField(
            <TypeIcon className="h-5 w-5 text-gray-400" />,
            <Input
              placeholder="Görev başlığı"
              className="pl-10"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />,
            "Başlık"
          )}

          {renderFormField(
            <AlignLeftIcon className="h-5 w-5 text-gray-400" />,
            <Textarea
              placeholder="Görev açıklaması"
              className="pl-10 pt-2"
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />,
            "Açıklama"
          )}

          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto" disabled={isSaving}>İptal</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

