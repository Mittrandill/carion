'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, Fuel, Receipt, Droplet, Plus, Search, Building2 } from 'lucide-react'

interface FuelTank {
  id: number;
  name: string;
  fuelType: string;
  currentAmount: number;
  user_id: string;
}

export default function FuelTankEntryForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [fuelTanks, setFuelTanks] = useState<FuelTank[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; value: string }[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<{ id: string; value: string }[]>([])
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false)
  const [newSupplier, setNewSupplier] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isNewSupplier, setIsNewSupplier] = useState(false)
  const makeInputRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)

  const [formData, setFormData] = useState({
    tankId: '',
    selectedTankName: '',
    date: new Date().toISOString().split('T')[0],
    receiptNo: '',
    supplier: '',
    supplierSearch: '',
    fuelType: '',
    amount: '',
    unitPrice: '',
    total: '',
  })

  useEffect(() => {
    fetchUserIdAndData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (makeInputRef.current && !makeInputRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchUserIdAndData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      fetchFuelTanks(user.id)
      fetchSuppliers(user.id)
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
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

  const fetchSuppliers = async (userId: string) => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('type', 'suppliers')
      .eq('user_id', userId)
    if (error) {
      console.error('Error fetching suppliers:', error)
      toast({
        title: "Hata",
        description: "Tedarikçiler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } else {
      setSuppliers(data || [])
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

    if (name === 'supplierSearch') {
      const searchTerm = value.toLowerCase().trim()
      const filtered = suppliers.filter(supplier => 
        supplier.value.toLowerCase().includes(searchTerm)
      )
      setFilteredSuppliers(filtered)
      setIsSuggestionsOpen(filtered.length > 0)
      setIsNewSupplier(!filtered.length && searchTerm.length > 0)
      setFormData(prev => ({ ...prev, [name]: value, supplier: '' }))
    }
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'tankId') {
      const selectedTank = fuelTanks.find(tank => tank.id.toString() === value)
      if (selectedTank) {
        setFormData(prev => ({
          ...prev,
          tankId: selectedTank.id.toString(),
          selectedTankName: selectedTank.name,
          fuelType: selectedTank.fuelType
        }))
      }
    }
  }

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddNewSupplier = async () => {
    if (!formData.supplierSearch.trim() || !userId) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen yeni tedarikçi adını girin ve oturum açtığınızdan emin olun.",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .insert([{ type: 'suppliers', value: formData.supplierSearch.trim(), user_id: userId }])
        .select()

      if (error) throw error

      toast({
        title: "Başarılı",
        description: "Yeni tedarikçi başarıyla eklendi.",
      })

      const newSupplierData = data[0] as { id: string; value: string }
      setSuppliers(prev => [...prev, newSupplierData])
      handleChange('supplier', newSupplierData.id)
      handleChange('supplierSearch', newSupplierData.value)
      setIsNewSupplier(false)
      setIsSuggestionsOpen(false)
    } catch (error) {
      console.error('Error adding new supplier:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yeni tedarikçi eklenirken bir hata oluştu.",
      })
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

    const selectedTank = fuelTanks.find(tank => tank.id.toString() === formData.tankId)
    if (selectedTank) {
      try {
        // Update fuel tank
        const { error: updateError } = await supabase
          .from('fuel_tanks')
          .update({ currentAmount: selectedTank.currentAmount + parseFloat(formData.amount) })
          .eq('id', selectedTank.id)
          .eq('user_id', userId)

        if (updateError) throw updateError

        // Add fuel stock entry
        const { error: insertError } = await supabase
          .from('fuel_stock_entries')
          .insert([{
            date: formData.date,
            receipt_no: formData.receiptNo,
            supplier: formData.supplier,
            amount: parseFloat(formData.amount),
            unit_price: parseFloat(formData.unitPrice),
            total: parseFloat(formData.total),
            tank_id: parseInt(formData.tankId),
            fuel_type: formData.fuelType,
            user_id: userId
          }])

        if (insertError) throw insertError

        toast({
          title: "Yakıt girişi kaydedildi",
          description: "Depo yakıt girişi başarıyla kaydedildi.",
        })
        resetForm()
        fetchFuelTanks(userId)
      } catch (error) {
        console.error('Error saving fuel entry:', error)
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Yakıt girişi kaydedilirken bir hata oluştu.",
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      tankId: '',
      selectedTankName: '',
      date: new Date().toISOString().split('T')[0],
      receiptNo: '',
      supplier: '',
      supplierSearch: '',
      fuelType: '',
      amount: '',
      unitPrice: '',
      total: '',
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
            <CardTitle className="text-2xl font-bold">Depo Yakıt Girişi</CardTitle>
            <CardDescription>Yakıt alımı detaylarını girin ve kaydedin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Fuel className="mr-2 h-5 w-5" /> Depo Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tankId">Depo Seçiniz</Label>
                      <Select onValueChange={handleSelectChange('tankId')} value={formData.tankId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Depo seçin">
                            {formData.selectedTankName || "Depo seçin"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {fuelTanks.map((tank) => (
                            <SelectItem key={tank.id} value={tank.id.toString()}>{tank.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuelType">Yakıt Türü</Label>
                      <Input
                        id="fuelType"
                        name="fuelType"
                        value={formData.fuelType}
                        readOnly
                        className="bg-muted-foreground/10"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Receipt className="mr-2 h-5 w-5" /> Yakıt Alım Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Tarih</Label>
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
                      <Label htmlFor="receiptNo">Fiş/Fatura No</Label>
                      <Input
                        id="receiptNo"
                        name="receiptNo"
                        value={formData.receiptNo}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 relative" ref={makeInputRef}>
                    <Label htmlFor="supplierSearch" className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>Tedarikçi</span>
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="supplierSearch"
                        name="supplierSearch"
                        value={formData.supplierSearch}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                      {isNewSupplier && (
                        <Button type="button" onClick={handleAddNewSupplier} className="whitespace-nowrap">
                          <Plus className="w-4 h-4 mr-2" /> Yeni Ekle
                        </Button>
                      )}
                    </div>
                    {isSuggestionsOpen && filteredSuppliers.length > 0 && (
                      <ul ref={suggestionsRef} className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSuppliers.map((supplier) => (
                          <li
                            key={supplier.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              handleChange('supplier', supplier.id);
                              handleChange('supplierSearch', supplier.value);
                              setIsSuggestionsOpen(false);
                            }}
                          >
                            {supplier.value}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Droplet className="mr-2 h-5 w-5" /> Yakıt Detayları</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Alınan Litre</Label>
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
                      <Label htmlFor="unitPrice">Birim Fiyat (TL)</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="total">Toplam Tutar (TL)</Label>
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
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={resetForm}>Vazgeç</Button>
                <Button type="submit">Kaydet</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

