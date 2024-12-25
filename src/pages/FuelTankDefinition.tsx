'use client'

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Fuel, Droplet, Gauge, Hash, Save, X } from 'lucide-react'

interface FuelTank {
  id: number
  name: string
  fuelType: string
  currentAmount: number
  capacity: number
  counterInfo: string
  user_id: string
}

export default function FuelTankDefinition() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [fuelTanks, setFuelTanks] = useState<FuelTank[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    fuelType: '',
    currentAmount: '',
    capacity: '',
    counterInfo: '',
  })

  useEffect(() => {
    fetchUserIdAndData()
  }, [])

  useEffect(() => {
    if (id && fuelTanks.length > 0) {
      const tank = fuelTanks.find(tank => tank.id === Number(id))
      if (tank) {
        setFormData({
          name: tank.name,
          fuelType: tank.fuelType,
          currentAmount: tank.currentAmount.toString(),
          capacity: tank.capacity.toString(),
          counterInfo: tank.counterInfo,
        })
      }
    }
  }, [id, fuelTanks])

  const fetchUserIdAndData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      fetchFuelTanks(user.id)
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturum açmamış",
        variant: "destructive",
      })
      navigate('/login')
    }
  }

  const fetchFuelTanks = async (userId: string) => {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .select('*')
      .eq('user_id', userId)
    if (error) {
      console.error('Error fetching fuel tanks:', error)
      toast({
        title: "Hata",
        description: "Yakıt depoları yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } else {
      setFuelTanks(data || [])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, fuelType: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    if (!userId) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturum açmamış",
        variant: "destructive",
      })
      navigate('/login')
      return
    }

    const tankData = {
      ...formData,
      currentAmount: parseFloat(formData.currentAmount),
      capacity: parseFloat(formData.capacity),
      user_id: userId,
    }

    try {
      if (id) {
        const { error } = await supabase
          .from('fuel_tanks')
          .update(tankData)
          .eq('id', id)
          .eq('user_id', userId)
        if (error) throw error
        toast({
          title: "Başarılı",
          description: "Yakıt deposu başarıyla güncellendi.",
        })
      } else {
        const { error } = await supabase
          .from('fuel_tanks')
          .insert([tankData])
        if (error) throw error
        toast({
          title: "Başarılı",
          description: "Yakıt deposu başarıyla eklendi.",
        })
      }
      navigate('/fuel-tanks')
    } catch (error) {
      toast({
        title: "Hata",
        description: id ? "Yakıt deposu güncellenirken bir hata oluştu." : "Yakıt deposu eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-48 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold flex items-center">
            <Fuel className="mr-2 h-8 w-8 text-primary" />
            {id ? 'Yakıt Deposu Düzenle' : 'Yeni Yakıt Deposu Ekle'}
          </CardTitle>
          <CardDescription>Lütfen aşağıdaki bilgileri doldurun.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium flex items-center">
                  <Hash className="mr-2 h-4 w-4" />
                  Depo Adı
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                  placeholder="Depo adını girin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuelType" className="text-sm font-medium flex items-center">
                  <Droplet className="mr-2 h-4 w-4" />
                  Depo Yakıt Türü
                </Label>
                <Select onValueChange={handleSelectChange} value={formData.fuelType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Yakıt türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BENZİN">BENZİN</SelectItem>
                    <SelectItem value="DİZEL">DİZEL</SelectItem>
                    <SelectItem value="LPG">LPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="currentAmount" className="text-sm font-medium flex items-center">
                  <Gauge className="mr-2 h-4 w-4" />
                  Mevcut Yakıt Stoğu (L)
                </Label>
                <Input
                  id="currentAmount"
                  name="currentAmount"
                  type="number"
                  value={formData.currentAmount}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                  placeholder="Mevcut miktar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-sm font-medium flex items-center">
                  <Fuel className="mr-2 h-4 w-4" />
                  Maksimum Kapasite (L)
                </Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                  placeholder="Maksimum kapasite"
                />
              </div>
            </div>
            <div className="mt-6">
              <Label htmlFor="counterInfo" className="text-sm font-medium flex items-center">
                <Hash className="mr-2 h-4 w-4" />
                Akaryakıt Pompası Sayaç Bilgisi
              </Label>
              <Input
                id="counterInfo"
                name="counterInfo"
                value={formData.counterInfo}
                onChange={handleInputChange}
                className="mt-1"
                placeholder="Sayaç bilgisini girin"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="outline" onClick={() => navigate('/fuel-tanks')} className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    İşleniyor
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {id ? 'Güncelle' : 'Kaydet'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}