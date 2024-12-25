'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Calendar, Truck, ArrowLeftRight } from 'lucide-react'

interface Vehicle {
  id: number
  plate: string
}

interface Tire {
  id: number
  vehicle_id: number
  position: string
  brand: string
  type: string
  size: string
  last_km?: number
  condition?: string
  current_km?: number
  last_change_date?: string
  serial_number?: string;
  dot_number?: string;
  estimated_lifetime?: number;
  pattern?: string;
}

interface TireStock {
  id: number
  brand: string
  type: string
  size: string
  quantity: number
  serial_number?: string;
  dot_number?: string;
  estimated_lifetime?: number;
  pattern?: string;
  condition?: string;
  user_id?: string;
}

export default function TireChangeForm() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [tireStocks, setTireStocks] = useState<TireStock[]>([])
  const [vehicleTires, setVehicleTires] = useState<Tire[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle_plate: '',
    tire_position: '',
    current_km: '',
    is_from_stock: 'true',
    installed_tire: '',
    removed_tire: '',
    removed_tire_km: '',
    removed_tire_condition: ''
  })
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUserSession()
    fetchVehicles()
    fetchTireStocks()
  }, [])

  const fetchUserSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (session?.user) {
        setUserId(session.user.id)
      } else {
        toast({
          title: "Uyarı",
          description: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching session:', error)
      toast({
        title: "Hata",
        description: "Oturum bilgisi alınırken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate')

      if (error) throw error

      console.log('Fetched vehicles:', data)
      setVehicles(data || [])
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      toast({
        title: "Hata",
        description: "Araçlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const fetchVehicleTires = async () => {
    if (!selectedVehicleId) return

    try {
      console.log('Fetching tires for vehicle:', selectedVehicleId)
      const { data, error } = await supabase
        .from('tires')
        .select('*')
        .eq('vehicle_id', selectedVehicleId)
        .order('position')

      if (error) throw error

      console.log('Fetched vehicle tires:', data)
      setVehicleTires(data || [])
    } catch (error) {
      console.error('Error fetching vehicle tires:', error)
      toast({
        title: "Hata",
        description: "Araç lastikleri yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (selectedVehicleId) {
      fetchVehicleTires()
    }
  }, [selectedVehicleId])

  async function fetchTireStocks() {
    try {
      const { data, error } = await supabase
        .from('tire_stocks')
        .select('*')

      if (error) throw error

      console.log('Fetched tire stocks:', data)
      setTireStocks(data || [])
    } catch (error) {
      console.error('Error fetching tire stocks:', error)
      toast({
        title: "Hata",
        description: "Lastik stokları yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleChange = async (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'vehicle_plate') {
      const selectedVehicle = vehicles.find(v => v.plate === value)
      console.log('Selected vehicle:', selectedVehicle)

      if (selectedVehicle) {
        setSelectedVehicleId(selectedVehicle.id)
        setSelectedTire(null)
        setFormData(prev => ({
          ...prev,
          tire_position: '',
          removed_tire: '',
          removed_tire_km: '',
          installed_tire: '',
          removed_tire_condition: ''
        }))
      }
    }

    if (name === 'tire_position') {
      const currentTire = vehicleTires.find(t => t.position === value)
      console.log('Selected tire:', currentTire)

      if (currentTire) {
        setSelectedTire(currentTire)
        setFormData(prev => ({
          ...prev,
          removed_tire: currentTire.id.toString(),
          removed_tire_km: currentTire.last_km?.toString() || prev.current_km,
          removed_tire_condition: currentTire.condition || 'stock'
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId || !selectedVehicleId) {
        throw new Error('Gerekli bilgiler eksik');
      }

      // Start a Supabase transaction using multiple queries
      const currentKm = parseInt(formData.current_km);
      const removedTireKm = parseInt(formData.removed_tire_km);

      // 1. Update the removed tire's status in vehicle tires
      const { error: updateTireError } = await supabase
        .from('tires')
        .update({
          current_km: removedTireKm,
          condition: formData.removed_tire_condition
        })
        .eq('vehicle_id', selectedVehicleId)
        .eq('position', formData.tire_position);

      if (updateTireError) throw updateTireError;

      // 2. If the tire should go back to stock
      if (formData.removed_tire_condition === 'stock') {
        const removedTire = vehicleTires.find(t => t.position === formData.tire_position);
        
        if (removedTire) {
          // Check if tire already exists in stock
          const { data: existingStock } = await supabase
            .from('tire_stocks')
            .select('*')
            .eq('serial_number', removedTire.serial_number)
            .single();

          if (existingStock) {
            // Update existing stock
            const { error: updateStockError } = await supabase
              .from('tire_stocks')
              .update({ quantity: existingStock.quantity + 1 })
              .eq('id', existingStock.id);

            if (updateStockError) throw updateStockError;
          } else {
            // Add to stock as new entry
            const { error: insertStockError } = await supabase
              .from('tire_stocks')
              .insert([{
                user_id: userId,
                brand: removedTire.brand,
                type: removedTire.type,
                pattern: removedTire.pattern,
                size: removedTire.size,
                condition: 'Used',
                serial_number: removedTire.serial_number,
                dot_number: removedTire.dot_number,
                estimated_lifetime: removedTire.estimated_lifetime,
                quantity: 1
              }]);

            if (insertStockError) throw insertStockError;
          }
        }
      }

      // 3. Update the installed tire information
      if (formData.is_from_stock === 'true' && formData.installed_tire) {
        // Get the tire from stock
        const { data: stockTire, error: stockTireError } = await supabase
          .from('tire_stocks')
          .select('*')
          .eq('id', formData.installed_tire)
          .single();

        if (stockTireError) throw stockTireError;

        // Update vehicle tire with new tire info
        const { error: updateVehicleTireError } = await supabase
          .from('tires')
          .update({
            brand: stockTire.brand,
            type: stockTire.type,
            pattern: stockTire.pattern,
            size: stockTire.size,
            serial_number: stockTire.serial_number,
            dot_number: stockTire.dot_number,
            estimated_lifetime: stockTire.estimated_lifetime,
            current_km: currentKm,
            condition: 'New'
          })
          .eq('vehicle_id', selectedVehicleId)
          .eq('position', formData.tire_position);

        if (updateVehicleTireError) throw updateVehicleTireError;

        // Decrease stock quantity
        const { error: decreaseStockError } = await supabase
          .from('tire_stocks')
          .update({ 
            quantity: stockTire.quantity - 1 
          })
          .eq('id', formData.installed_tire)
          .gt('quantity', 0);

        if (decreaseStockError) throw decreaseStockError;
      }

      // 4. Create tire change record
      const { error: recordError } = await supabase
        .from('tire_records')
        .insert([{
          user_id: userId,
          date: formData.date,
          vehicle_id: selectedVehicleId,
          tire_position: formData.tire_position,
          change_km: currentKm,
          removed_tire_id: formData.removed_tire,
          installed_tire_id: formData.installed_tire,
          removed_tire_km: removedTireKm,
          installed_tire_km: 0
        }]);

      if (recordError) throw recordError;

      toast({
        title: "Başarılı",
        description: "Lastik değişimi başarıyla kaydedildi.",
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        vehicle_plate: '',
        tire_position: '',
        current_km: '',
        is_from_stock: 'true',
        installed_tire: '',
        removed_tire: '',
        removed_tire_km: '',
        removed_tire_condition: ''
      });
      setSelectedVehicleId(null);
      setSelectedTire(null);

    } catch (error) {
      console.error('Error during tire change:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lastik değişimi kaydedilirken bir hata oluştu.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pr-48 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="flex justify-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Lastik Değişim Formu</CardTitle>
            <CardDescription>Araç lastik değişim bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Calendar className="mr-2" /> Değişim Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Tarih</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_plate">Araç Plakası</Label>
                      <Select value={formData.vehicle_plate} onValueChange={(value) => handleChange('vehicle_plate', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Araç Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.plate}>{vehicle.plate}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Truck className="mr-2" /> Lastik Detayları
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tire_position">Lastik Pozisyonu ve Çıkarılan Lastik</Label>
                      <Select 
                        value={formData.tire_position} 
                        onValueChange={(value) => handleChange('tire_position', value)}
                        disabled={!selectedVehicleId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pozisyon Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTires.map((tire, index) => (
                            <SelectItem 
                              key={`${tire.id}-${tire.position}-${tire.serial_number || ''}-${Date.now()}-${index}`} 
                              value={tire.position}
                            >
                              {`${tire.position}: ${tire.brand || ''} ${tire.type || ''} ${tire.size || ''}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_km">Araç Güncel KM</Label>
                      <Input
                        id="current_km"
                        type="number"
                        value={formData.current_km}
                        onChange={(e) => handleChange('current_km', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {selectedTire && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="removed_tire_km">Çıkarılan Lastik KM'si</Label>
                        <Input
                          id="removed_tire_km"
                          type="number"
                          value={formData.removed_tire_km}
                          onChange={(e) => handleChange('removed_tire_km', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="removed_tire_condition">Çıkarılan Lastik Durumu</Label>
                        <Select 
                          value={formData.removed_tire_condition} 
                          onValueChange={(value) => handleChange('removed_tire_condition', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Durum Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stock">Stoğa Geri Gönder</SelectItem>
                            <SelectItem value="retread">Kaplamaya Gönder</SelectItem>
                            <SelectItem value="scrap">Hurdaya Ayır</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ArrowLeftRight className="mr-2" /> Yeni Lastik Detayları
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="is_from_stock">Lastik Kaynağı</Label>
                      <Select value={formData.is_from_stock} onValueChange={(value) => handleChange('is_from_stock', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Lastik Kaynağı Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Stoktan</SelectItem>
                          <SelectItem value="false">Harici</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.is_from_stock === 'true' && (
                      <div className="space-y-2">
                        <Label htmlFor="installed_tire">Takılacak Lastik</Label>
                        <Select 
                          value={formData.installed_tire} 
                          onValueChange={(value) => handleChange('installed_tire', value)}
                          disabled={!formData.tire_position}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Takılacak Lastik Seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {tireStocks
                              .filter(tire => tire.quantity > 0)
                              .map(tire => (
                                <SelectItem key={tire.id} value={tire.id.toString()}>
                                  {`${tire.brand} ${tire.type} ${tire.size} (Stok: ${tire.quantity})`}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      vehicle_plate: '',
                      tire_position: '',
                      current_km: '',
                      is_from_stock: 'true',
                      installed_tire: '',
                      removed_tire: '',
                      removed_tire_km: '',
                      removed_tire_condition: ''
                    })
                    setSelectedTire(null)
                    setVehicleTires([])
                    setSelectedVehicleId(null)
                  }}
                  disabled={loading}
                >
                  Temizle
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : 'Lastik Değişimini Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

