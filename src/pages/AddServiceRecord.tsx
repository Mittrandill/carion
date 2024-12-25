'use client'

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { Textarea } from '@/components/ui/textarea'
import { Car, Wrench, FileText, Calendar, Gauge, Target, Calculator, ArrowLeft, Save, Settings } from 'lucide-react'

interface Vehicle {
  id: string
  plate: string
  currentKm: number
}

export default function AddServiceRecord() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    vehicleid: '',
    title: '',
    description: '',
    date: '',
    currentKm: '',
    nextServiceKm: '',
    nextServiceDate: '',
    cost: '',
    tag: '',
  })
  const [plateSearch, setPlateSearch] = useState('')
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false) // Added state for dropdown visibility

  useEffect(() => {
    fetchUserIdAndVehicles()
  }, [])

  useEffect(() => {
    const filtered = vehicles.filter(vehicle =>
      vehicle.plate.toLowerCase().includes(plateSearch.toLowerCase())
    )
    setFilteredVehicles(filtered)
  }, [plateSearch, vehicles])

  const fetchUserIdAndVehicles = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', user.id)
        if (error) throw error
        console.log('Fetched vehicles:', data)
        setVehicles(data || [])
      } else {
        throw new Error('No authenticated user')
      }
    } catch (error) {
      console.error('Error fetching user or vehicles:', error)
      toast({
        title: "Hata",
        description: "Kullanıcı bilgileri veya araçlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleVehicleChange = (value: string) => {
    const selectedVehicle = vehicles.find(v => v.id === value)
    if (selectedVehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleid: value,
        currentKm: selectedVehicle.currentKm.toString(),
      }))
      setPlateSearch(selectedVehicle.plate)
      setIsDropdownOpen(false) // Close dropdown after selection
    }
  }

  const checkAndCreateServiceNotification = async (vehicleid: string, currentKm: number, nextServiceKm: number, serviceTitle: string) => {
    if (!userId) return

    const KM_THRESHOLD = 500 // Bildirim için km eşiği
    const remainingKm = nextServiceKm - currentKm

    if (remainingKm <= KM_THRESHOLD && remainingKm > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleid)
      if (!vehicle) return

      const notificationTask = {
        vehicleid: vehicleid,
        title: `Yaklaşan Servis Bildirimi: ${serviceTitle}`,
        description: `${vehicle.plate} Plakalı Aracın Sonraki "${serviceTitle}" İçin ${remainingKm} km kaldı`,
        date: new Date().toISOString().split('T')[0],
        tag: 'servis',
        currentKm: currentKm,
        nextServiceKm: nextServiceKm,
        user_id: userId
      }

      try {
        const { error } = await supabase
          .from('tasks')
          .insert([notificationTask])
        if (error) throw error
        console.log(`Bildirim oluşturuldu: ${notificationTask.description}`)
        toast({
          title: "Bilgi",
          description: `${serviceTitle} için yaklaşan bakım bildirimi oluşturuldu.`,
        })
      } catch (error) {
        console.error('Bildirim oluşturma hatası:', error)
        toast({
          title: "Hata",
          description: "Bildirim oluşturulurken bir hata meydana geldi.",
          variant: "destructive",
        })
      }
    } else {
      console.log(`Bildirim oluşturulmadı. Kalan km: ${remainingKm}, Eşik: ${KM_THRESHOLD}`)
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

    const serviceData = {
      vehicleid: formData.vehicleid,
      title: formData.tag,
      description: `${formData.title}\n\n${formData.description}`,
      date: formData.date,
      currentKm: formData.currentKm ? parseInt(formData.currentKm) : undefined,
      nextServiceKm: formData.nextServiceKm ? parseInt(formData.nextServiceKm) : undefined,
      nextServiceDate: formData.nextServiceDate || null,
      cost: formData.cost ? parseFloat(formData.cost) : 0,
      tag: formData.tag,
      user_id: userId
    }

    try {
      const { data: serviceRecord, error: serviceError } = await supabase
        .from('service_records')
        .insert([serviceData])
        .select()
      if (serviceError) throw serviceError

      toast({
        title: "Başarılı",
        description: "Yeni servis kaydı başarıyla eklendi.",
      })

      if (serviceData.nextServiceKm && serviceData.currentKm) {
        await checkAndCreateServiceNotification(serviceData.vehicleid, serviceData.currentKm, serviceData.nextServiceKm, serviceData.title)
      }

      // Add a new task if nextServiceDate is provided
      if (serviceData.nextServiceDate) {
        const vehicle = vehicles.find(v => v.id === serviceData.vehicleid)
        if (vehicle) {
          const taskData = {
            vehicleid: serviceData.vehicleid,
            title: `Planlı Servis: ${serviceData.title}`,
            description: `${vehicle.plate} plakalı araç için ${serviceData.title} servisi planlandı.`,
            date: serviceData.nextServiceDate,
            tag: 'servis',
            user_id: userId
          }

          const { error: taskError } = await supabase
            .from('tasks')
            .insert([taskData])

          if (taskError) {
            console.error('Error creating task:', taskError)
            toast({
              title: "Uyarı",
              description: "Servis kaydı eklendi, ancak görev oluşturulurken bir hata oluştu.",
              variant: "warning",
            })
          } else {
            toast({
              title: "Bilgi",
              description: "Servis kaydı ve planlı görev başarıyla eklendi.",
            })
          }
        }
      }

      if (serviceData.currentKm) {
        const { error } = await supabase
          .from('vehicles')
          .update({ currentKm: serviceData.currentKm })
          .eq('id', serviceData.vehicleid)
          .eq('user_id', userId)
        if (error) throw error
      }

      navigate('/service')
    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: "Hata",
        description: "Servis kaydı eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Yükleniyor...</div>
  }

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-48 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold flex items-center">
            <Settings className="mr-2 h-8 w-8 text-primary" />
            Yeni Servis / Bakım Kaydı Ekle
          </CardTitle>
          <CardDescription>Lütfen aşağıdaki bilgileri doldurun.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="plateSearch" className="text-sm font-medium flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Araç Plakası
                </Label>
                <div className="relative">
                  <Input
                    id="plateSearch"
                    name="plateSearch"
                    value={plateSearch}
                    onChange={(e) => setPlateSearch(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsDropdownOpen(false), 200)
                    }}
                    placeholder="Araç plakası girin"
                    className="w-full"
                  />
                  {plateSearch && filteredVehicles.length > 0 && isDropdownOpen && ( // Updated condition to include isDropdownOpen
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            handleVehicleChange(vehicle.id)
                            setPlateSearch(vehicle.plate)
                            setIsDropdownOpen(false) // Close dropdown after selection
                          }}
                        >
                          {vehicle.plate}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <p>Seçilen Araç Plakası: {formData.vehicleid ? vehicles.find(v => v.id === formData.vehicleid)?.plate : 'Seçilmedi'}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="tag" className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Servis/Bakım Türü
                </Label>
                <Select
                  name="tag"
                  value={formData.tag}
                  onValueChange={(value) => handleInputChange({ target: { name: 'tag', value } } as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Servis/Bakım türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Periyodik Bakım">Periyodik Bakım</SelectItem>
                    <SelectItem value="Motor Bakım">Motor Bakım</SelectItem>
                    <SelectItem value="Fren Bakım">Fren Bakım</SelectItem>
                    <SelectItem value="Lastik Değişim">Lastik Değişim</SelectItem>
                    <SelectItem value="Yağ Servisi">Yağ Servisi</SelectItem>
                    <SelectItem value="Diğer">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Başlık
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Kısa bir başlık girin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Açıklama
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Servis detaylarını buraya yazın..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tarih
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentKm" className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Mevcut Km
                  </Label>
                  <Input
                    id="currentKm"
                    name="currentKm"
                    type="number"
                    value={formData.currentKm}
                    onChange={handleInputChange}
                    placeholder="Örn: 50000"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nextServiceKm" className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Sonraki Servis Km
                  </Label>
                  <Input
                    id="nextServiceKm"
                    name="nextServiceKm"
                    type="number"
                    value={formData.nextServiceKm}
                    onChange={handleInputChange}
                    placeholder="Örn: 60000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextServiceDate" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Sonraki Servis Tarihi
                  </Label>
                  <Input
                    id="nextServiceDate"
                    name="nextServiceDate"
                    type="date"
                    value={formData.nextServiceDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost" className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Maliyet (TL)
                </Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleInputChange}
                  placeholder="Örn: 1000.00"
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/service')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            İptal
          </Button>
          <Button onClick={handleSubmit} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Kaydet
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

