'use client'

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { Ruler, Tag, Hash, BarChart, Calendar, DollarSign, Truck, ShoppingBag } from 'lucide-react'

export default function NewTireForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    brand: '',
    type: '',
    pattern: '',
    size: '',
    condition: '',
    serial_number: '',
    dot_number: '',
    estimated_lifetime: '',
    purchase_date: '',
    supplier: '',
    price: '',
    quantity: '1' // New field for quantity
  })

  useEffect(() => {
    fetchUserSession()
  }, [])

  const fetchUserSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error fetching user session:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı oturumu alınamadı.",
      })
      navigate('/login')
      return
    }
    if (session?.user) {
      setUserId(session.user.id)
    } else {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
      })
      navigate('/login')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Önce mevcut lastikleri kontrol et
      const { data: existingTires, error: fetchError } = await supabase
        .from('tire_stocks')
        .select('*')
        .eq('brand', formData.brand)
        .eq('type', formData.type)
        .eq('pattern', formData.pattern)
        .eq('size', formData.size)
        .eq('user_id', userId)

      if (fetchError) throw fetchError

      if (existingTires && existingTires.length > 0) {
        // Mevcut lastik varsa, stok adedini güncelle
        const existingTire = existingTires[0]
        const updatedQuantity = Number(existingTire.quantity) + Number(formData.quantity)

        const { error: updateError } = await supabase
          .from('tire_stocks')
          .update({ quantity: updatedQuantity })
          .eq('id', existingTire.id)

        if (updateError) throw updateError

        toast({
          title: "Başarılı",
          description: `Mevcut lastik stok adedi ${formData.quantity} adet artırıldı. Yeni stok: ${updatedQuantity}`,
        })
      } else {
        // Yeni lastik ekle
        const newTire = {
          ...formData,
          user_id: userId,
          quantity: Number(formData.quantity)
        }

        const { error: insertError } = await supabase
          .from('tire_stocks')
          .insert([newTire])

        if (insertError) throw insertError

        toast({
          title: "Başarılı",
          description: `Yeni lastik ${formData.quantity} adet olarak başarıyla eklendi.`,
        })
      }

      resetForm()
    } catch (error) {
      console.error('Error adding/updating tire:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lastik eklenirken veya güncellenirken bir hata oluştu.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      brand: '',
      type: '',
      pattern: '',
      size: '',
      condition: '',
      serial_number: '',
      dot_number: '',
      estimated_lifetime: '',
      purchase_date: '',
      supplier: '',
      price: '',
      quantity: '1'
    })
  }

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-48 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="flex justify-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Yeni Lastik Girişi</CardTitle>
            <CardDescription>Envantere yeni bir lastik ekleyin veya mevcut lastiğin stok adedini güncelleyin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Tag className="mr-2" /> Lastik Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand" className="flex items-center">
                        <Tag className="mr-2 h-4 w-4" /> Marka
                      </Label>
                      <Input
                        id="brand"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type" className="flex items-center">
                        <Tag className="mr-2 h-4 w-4" /> Tip
                      </Label>
                      <Select onValueChange={handleSelectChange('type')} value={formData.type}>
                        <SelectTrigger>
                          <SelectValue placeholder="Lastik tipi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yaz">Yaz</SelectItem>
                          <SelectItem value="Kış">Kış</SelectItem>
                          <SelectItem value="4 Mevsim">4 Mevsim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Ruler className="mr-2" /> Lastik Özellikleri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pattern" className="flex items-center">
                        <Hash className="mr-2 h-4 w-4" /> Desen
                      </Label>
                      <Input
                        id="pattern"
                        name="pattern"
                        value={formData.pattern}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size" className="flex items-center">
                        <Ruler className="mr-2 h-4 w-4" /> Ebat
                      </Label>
                      <Input
                        id="size"
                        name="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="condition" className="flex items-center">
                        <BarChart className="mr-2 h-4 w-4" /> Durum
                      </Label>
                      <Select onValueChange={handleSelectChange('condition')} value={formData.condition}>
                        <SelectTrigger>
                          <SelectValue placeholder="Lastik durumu seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yeni">Yeni</SelectItem>
                          <SelectItem value="İyi">İyi</SelectItem>
                          <SelectItem value="Orta">Orta</SelectItem>
                          <SelectItem value="Kötü">Kötü</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Hash className="mr-2" /> Lastik Detayları</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serial_number" className="flex items-center">
                        <Hash className="mr-2 h-4 w-4" /> Seri No
                      </Label>
                      <Input
                        id="serial_number"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dot_number" className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" /> DOT No
                      </Label>
                      <Input
                        id="dot_number"
                        name="dot_number"
                        value={formData.dot_number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimated_lifetime" className="flex items-center">
                        <BarChart className="mr-2 h-4 w-4" /> Tahmini Lastik Ömrü (km)
                      </Label>
                      <Input
                        id="estimated_lifetime"
                        name="estimated_lifetime"
                        type="number"
                        value={formData.estimated_lifetime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="flex items-center">
                        <ShoppingBag className="mr-2 h-4 w-4" /> Miktar
                      </Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><ShoppingBag className="mr-2" /> Satın Alma Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchase_date" className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" /> Satın Alma Tarihi
                      </Label>
                      <Input
                        id="purchase_date"
                        name="purchase_date"
                        type="date"
                        value={formData.purchase_date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier" className="flex items-center">
                        <Truck className="mr-2 h-4 w-4" /> Tedarikçi
                      </Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price" className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" /> Fiyat
                      </Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={resetForm}>Vazgeç</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}