'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Fuel, Truck, CreditCard, Hash, Banknote, Calculator, Plus, Search } from 'lucide-react'

interface Vehicle {
  id: string
  plate: string
  currentKm: number
  fuelType: string
}

interface FuelTank {
  id: string
  name: string
  currentAmount: number
  counterInfo: string
  fuelType: string
}

interface Station {
  id: string
  value: string
}

function VehicleFuelEntry() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelTanks, setFuelTanks] = useState<FuelTank[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [newStation, setNewStation] = useState('')
  const [isAddingNewStation, setIsAddingNewStation] = useState(false);
  const [userId, setUserId] = useState<string | null>(null)
  const stationInputRef = useRef<HTMLInputElement>(null)
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [suggestedStations, setSuggestedStations] = useState<Station[]>([]);
  const suggestionsRef = useRef<HTMLUListElement>(null);


  const [formData, setFormData] = useState({
    vehicleId: '',
    vehiclePlate: '',
    currentKm: '',
    date: new Date().toISOString().split('T')[0],
    receiptNo: '',
    stationType: 'external',
    station: '',
    stationSearch: '',
    fuelType: '',
    amount: '',
    unitPrice: '',
    total: '',
    counterType: 'withCounter',
    tankId: '',
    selectedTankName: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchUserSession()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchFuelTanks()
      fetchVehicles()
      fetchStations()
    }
  }, [userId])

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

  const fetchFuelTanks = async () => {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .select('*')
      .eq('user_id', userId)
    if (error) {
      console.error('Error fetching fuel tanks:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yakıt depoları yüklenirken bir hata oluştu.",
      })
    } else {
      setFuelTanks(data || [])
    }
  }

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
    if (error) {
      console.error('Error fetching vehicles:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Araçlar yüklenirken bir hata oluştu.",
      })
    } else {
      setVehicles(data || [])
    }
  }

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('type', 'stations')
      .eq('user_id', userId)
    if (error) {
      console.error('Error fetching stations:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İstasyonlar yüklenirken bir hata oluştu.",
      })
    } else {
      setStations(data || [])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'amount' || name === 'unitPrice') {
      const amount = name === 'amount' ? parseFloat(value) : parseFloat(formData.amount)
      const unitPrice = name === 'unitPrice' ? parseFloat(value) : parseFloat(formData.unitPrice)
      if (!isNaN(amount) && !isNaN(unitPrice)) {
        setFormData(prev => ({ ...prev, total: (amount * unitPrice).toFixed(2) }))
      }
    }

    if (name === 'stationSearch') {
      const searchTerm = value.toLowerCase().trim()
      const filtered = stations.filter(station => 
        station.value.toLowerCase().includes(searchTerm)
      )
      setSuggestedStations(filtered);
      setIsSuggestionsOpen(true);
      setFormData(prev => ({ ...prev, [name]: value, station: '' }))
      setIsAddingNewStation(filtered.length === 0);
    }
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'stationType') {
      if (value === 'internal') {
        setFormData(prev => ({ ...prev, station: '', tankId: '', selectedTankName: '' }))
      } else {
        setFormData(prev => ({ ...prev, tankId: '', selectedTankName: '', counterType: 'withCounter' }))
      }
    }

    if (name === 'tankId') {
      const selectedTank = fuelTanks.find(tank => tank.id.toString() === value)
      if (selectedTank) {
        setFormData(prev => ({
          ...prev,
          tankId: selectedTank.id,
          selectedTankName: selectedTank.name,
          fuelType: selectedTank.fuelType
        }))
      }
    }

    if (name === 'station') {
      if (value === 'new') {
        setIsAddingNewStation(true)
        setFormData(prev => ({ ...prev, station: '', stationSearch: '' }))
      } else {
        const selectedStation = stations.find(s => s.id === value)
        if (selectedStation) {
          setFormData(prev => ({ 
            ...prev, 
            station: selectedStation.id, 
            stationSearch: selectedStation.value 
          }))
        }
      }
    }
  }

  const handleAddNewStation = async () => {
    if (!formData.stationSearch.trim() || !userId) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen yeni istasyon adını girin ve oturum açtığınızdan emin olun.",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .insert([{ 
          type: 'stations', 
          value: formData.stationSearch.trim(),
          user_id: userId 
        }])
        .select()

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Yeni istasyon başarıyla eklendi.",
      })

      const newStationData = data[0] as Station
      setStations(prev => [...prev, newStationData])
      setFormData(prev => ({ 
        ...prev, 
        station: newStationData.id, 
        stationSearch: newStationData.value 
      }))
      setIsAddingNewStation(false)
      setIsSuggestionsOpen(false)
    } catch (error) {
      console.error('Error adding new station:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yeni istasyon eklenirken bir hata oluştu.",
      })
    }
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
      if (!formData.vehicleId || formData.vehicleId === '') {
        throw new Error("Geçerli bir araç seçilmedi")
      }

      if (formData.stationType === 'internal' && !formData.tankId) {
        throw new Error("Lütfen bir yakıt deposu seçin")
      }

      const newRecord = {
        vehicle_id: formData.vehicleId,
        current_km: parseInt(formData.currentKm),
        date: formData.date,
        receipt_no: formData.receiptNo,
        station_type: formData.stationType,
        station: formData.stationType === 'external' ? formData.stationSearch : formData.selectedTankName,
        fuel_type: formData.fuelType,
        amount: parseFloat(formData.amount),
        unit_price: parseFloat(formData.unitPrice),
        total: parseFloat(formData.total),
        counter_type: formData.counterType,
        tank_id: formData.tankId || null,
        user_id: userId
      }

      if (formData.stationType === 'internal') {
        const selectedTank = fuelTanks.find(tank => tank.id === formData.tankId)
        if (selectedTank) {
          const updatedTank = {
            currentAmount: selectedTank.currentAmount - parseFloat(formData.amount),
            counterInfo: formData.counterType === 'withCounter' 
              ? (parseInt(selectedTank.counterInfo) + parseInt(formData.amount)).toString()
              : selectedTank.counterInfo,
            user_id: userId
          }
          const { error: tankUpdateError } = await supabase
            .from('fuel_tanks')
            .update(updatedTank)
            .eq('id', selectedTank.id)
            .eq('user_id', userId)
          if (tankUpdateError) throw tankUpdateError
        } else {
          throw new Error("Seçilen yakıt deposu bulunamadı")
        }
      }

      const { data: addedFuelRecord, error: fuelRecordError } = await supabase
        .from('fuel_records')
        .insert([newRecord])
        .select()
      if (fuelRecordError) throw fuelRecordError

      const vehicleToUpdate = vehicles.find(v => v.id === formData.vehicleId)
      if (vehicleToUpdate && formData.currentKm) {
        const updatedVehicle = {
          currentKm: parseInt(formData.currentKm),
          updated_at: formData.date,
          user_id: userId
        }
        const { error: vehicleUpdateError } = await supabase
          .from('vehicles')
          .update(updatedVehicle)
          .eq('id', vehicleToUpdate.id)
          .eq('user_id', userId)
        if (vehicleUpdateError) throw vehicleUpdateError
      }

      if (formData.currentKm) {
        const kmRecord = {
          vehicle_id: formData.vehicleId,
          km: parseInt(formData.currentKm),
          date: formData.date,
          user_id: userId
        }
        const { error: kmRecordError } = await supabase
          .from('km_records')
          .insert([kmRecord])
        if (kmRecordError) {
          throw new Error(`KM kaydı eklenirken hata oluştu: ${kmRecordError.message}`)
        }
      }

      toast({
        title: "Başarılı",
        description: "Yakıt girişi ve km kaydı başarıyla kaydedildi.",
      })
      resetForm()
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Yakıt girişi ve km kaydı yapılırken bir hata oluştu. Lütfen tekrar deneyin.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      vehiclePlate: '',
      currentKm: '',
      date: new Date().toISOString().split('T')[0],
      receiptNo: '',
      stationType: 'external',
      station: '',
      stationSearch: '',
      fuelType: '',
      amount: '',
      unitPrice: '',
      total: '',
      counterType: 'withCounter',
      tankId: '',
      selectedTankName: '',
    })
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          stationInputRef.current && !stationInputRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isAddingNewStation && stationInputRef.current) {
      stationInputRef.current.focus()
    }
  }, [isAddingNewStation])

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-48 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="flex justify-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Araç Yakıt Girişi</CardTitle>
            <CardDescription>Araç için yeni bir yakıt girişi yapın</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Truck className="mr-2" /> Araç Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleSearch" className="flex  items-center">
                        <CreditCard className="mr-2 h-4 w-4" /> Araç Plakası
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          id="vehicleSearch"
                          name="vehicleSearch"
                          value={formData.vehiclePlate}
                          onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase()
                            setFormData(prev => ({ ...prev, vehiclePlate: e.target.value, vehicleId: '' }))
                            const filtered = vehicles.filter(vehicle => 
                              vehicle.plate.toLowerCase().includes(searchTerm)
                            )
                            setFilteredVehicles(filtered)
                          }}
                          className="pl-8"
                          placeholder="Araç plakası ara"
                        />
                      </div>
                      {formData.vehiclePlate && !formData.vehicleId && (
                        <ul className="mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                          {filteredVehicles.map((vehicle) => (
                            <li
                              key={vehicle.id}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  vehicleId: vehicle.id,
                                  vehiclePlate: vehicle.plate,
                                  currentKm: vehicle.currentKm.toString(),
                                  fuelType: vehicle.fuelType
                                }))
                                setFilteredVehicles([])
                              }}
                            >
                              {vehicle.plate}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentKm" className="flex items-center">
                        <Hash className="mr-2 h-4 w-4" /> Araç Km/Saat Bilgisi
                      </Label>
                      <Input
                        id="currentKm"
                        name="currentKm"
                        value={formData.currentKm}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Fuel className="mr-2" /> Akaryakıt Alım Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" /> Tarih
                      </Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receiptNo" className="flex items-center">
                        <Hash className="mr-2 h-4 w-4" /> Matbuu Fiş/Fatura No
                      </Label>
                      <Input
                        id="receiptNo"
                        name="receiptNo"
                        value={formData.receiptNo}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label className="flex items-center">
                      <Fuel className="mr-2 h-4 w-4" /> İstasyon Tipi
                    </Label>
                    <RadioGroup
                      value={formData.stationType}
                      onValueChange={handleSelectChange('stationType')}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2 rounded-lg border p-4">
                        <RadioGroupItem value="internal" id="internal" />
                        <div>
                          <Label htmlFor="internal" className="font-medium">Stok</Label>
                          <p className="text-sm text-muted-foreground">Yakıt girişi mevcut stoktan yapılacak</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border p-4">
                        <RadioGroupItem value="external" id="external" />
                        <div>
                          <Label htmlFor="external" className="font-medium">Harici İstasyon</Label>
                          <p className="text-sm text-muted-foreground">Yakıt dış istasyondan alınacak</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.stationType === 'internal' ? (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tankId" className="flex items-center">
                          <Fuel className="mr-2 h-4 w-4" /> Depo Seçiniz
                        </Label>
                        <Select onValueChange={handleSelectChange('tankId')} value={formData.tankId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Depo seçin">
                              {formData.selectedTankName || "Depo seçin"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {fuelTanks.map((tank) => (
                              <SelectItem key={tank.id} value={tank.id}>{tank.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center">
                          <Hash className="mr-2 h-4 w-4" /> Sayaç Durumu
                        </Label>
                        <RadioGroup
                          value={formData.counterType}
                          onValueChange={handleSelectChange('counterType')}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-2 rounded-lg border p-4">
                            <RadioGroupItem value="withCounter" id="withCounter" />
                            <div>
                              <Label htmlFor="withCounter" className="font-medium">Sayaçlı</Label>
                              <p className="text-sm text-muted-foreground">Sayaç bilgisi güncellenecek</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 rounded-lg border p-4">
                            <RadioGroupItem value="withoutCounter" id="withoutCounter" />
                            <div>
                              <Label htmlFor="withoutCounter" className="font-medium">Sayaçsız</Label>
                              <p className="text-sm text-muted-foreground">Sayaç bilgisi güncellenmeyecek</p>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2 relative" ref={stationInputRef}>
                      <Label htmlFor="stationSearch" className="flex items-center">
                        <Fuel className="mr-2 h-4 w-4" /> İstasyon Seçiniz
                      </Label>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-grow">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <Input
                            id="stationSearch"
                            name="stationSearch"
                            value={formData.stationSearch}
                            onChange={handleInputChange}
                            className="pl-8 w-full"
                            placeholder="İstasyon ara veya seç"
                          />
                        </div>
                        {isAddingNewStation && (
                          <Button type="button" onClick={handleAddNewStation} className="whitespace-nowrap">
                            <Plus className="w-4 h-4 mr-2" /> Yeni Ekle
                          </Button>
                        )}
                      </div>
                      {isSuggestionsOpen && suggestedStations.length > 0 && (
                        <ul ref={suggestionsRef} className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {suggestedStations.map((station) => (
                            <li
                              key={station.id}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  station: station.id,
                                  stationSearch: station.value
                                }));
                                setIsSuggestionsOpen(false);
                              }}
                            >
                              {station.value}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Fuel className="mr-2" /> Yakıt Detayları</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuelType" className="flex items-center">
                        <Fuel className="mr-2 h-4 w-4" /> Yakıt Cinsi
                      </Label>
                      <Input
                        id="fuelType"
                        name="fuelType"
                        value={formData.fuelType}
                        onChange={handleInputChange}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="flex items-center">
                        <Fuel className="mr-2 h-4 w-4" /> Alınan Litre
                      </Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice" className="flex items-center">
                        <Banknote className="mr-2 h-4 w-4" /> Birim Fiyat (TL)
                      </Label>
                      <Input
                        id="unitPrice"
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="total" className="flex items-center">
                      <Calculator className="mr-2 h-4 w-4" /> Tutar (TL)
                    </Label>
                    <Input
                      id="total"
                      name="total"
                      value={formData.total}
                      onChange={handleInputChange}
                      required
                      readOnly
                      className="bg-gray-100"
                    />
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

export default VehicleFuelEntry

