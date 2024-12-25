'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, parse, isWithinInterval, subDays } from 'date-fns'
import { ArrowLeft, Edit, Droplet, Truck, Calendar, Gauge, DollarSign, TrendingDown, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRangePicker } from "@/components/ui/date-range-picker"

const ITEMS_PER_PAGE = 7

interface FuelTank {
  id: number;
  name: string;
  fuelType: string;
  currentAmount: number;
  capacity: number;
  counterInfo: string;
}

interface FuelStockEntry {
  id: number;
  date: string;
  tank_id: number;
  receipt_no: string;
  supplier: string;
  amount: number;
  unit_price: number;
  total: number;
}

interface FuelRecord {
  id: number;
  date: string;
  tank_id: number;
  vehicle_id: number;
  amount: number;
  unit_price: number;
  total: number;
}

interface Vehicle {
  id: number;
  plate: string;
}

interface Supplier {
  id: number;
  value: string;
}

export default function FuelTankDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [fuelTank, setFuelTank] = useState<FuelTank | null>(null)
  const [fuelStockEntries, setFuelStockEntries] = useState<FuelStockEntry[]>([])
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [activeTab, setActiveTab] = useState('entries')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FuelStockEntry | FuelRecord | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null)
  const { toast } = useToast()

  // New state for search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null })
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  // New state for showing/hiding tank status and summary
  const [showTankStatus, setShowTankStatus] = useState(true)

  useEffect(() => {
    fetchFuelTankData()
    fetchFuelStockEntries()
    fetchFuelRecords()
    fetchVehicles()
    fetchSuppliers()
  }, [id])

  const fetchFuelTankData = async () => {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      console.error('Error fetching fuel tank:', error)
    } else {
      setFuelTank(data)
    }
  }

  const fetchFuelStockEntries = async () => {
    const { data, error } = await supabase
      .from('fuel_stock_entries')
      .select('*')
      .eq('tank_id', id)
    if (error) {
      console.error('Error fetching fuel stock entries:', error)
    } else {
      setFuelStockEntries(data || [])
    }
  }

  const fetchFuelRecords = async () => {
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('tank_id', id)
    if (error) {
      console.error('Error fetching fuel records:', error)
    } else {
      setFuelRecords(data || [])
    }
  }

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate')
    if (error) {
      console.error('Error fetching vehicles:', error)
    } else {
      setVehicles(data || [])
    }
  }

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('type', 'suppliers')
    if (error) {
      console.error('Error fetching suppliers:', error)
    } else {
      setSuppliers(data || [])
    }
  }

  const handleSort = useCallback((key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }, [])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange({ from: range.from || null, to: range.to || null })
  }

  const handleClearDateRange = () => {
    setDateRange({ from: null, to: null })
  }

  const handleSupplierFilter = (value: string) => {
    setSelectedSupplier(value === 'all' ? null : value)
  }

  const handleVehicleFilter = (value: string) => {
    setSelectedVehicle(value === 'all' ? null : value)
  }

  const filteredRecords = useMemo(() => {
    let filtered = activeTab === 'entries' ? fuelStockEntries : fuelRecords

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(record => 
        Object.values(record).some(value => 
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply date range filter
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= dateRange.from! && recordDate <= dateRange.to!
      })
    }

    // Apply supplier filter (for entries)
    if (selectedSupplier && activeTab === 'entries') {
      filtered = filtered.filter(record => (record as FuelStockEntry).supplier === selectedSupplier)
    }

    // Apply vehicle filter (for exits)
    if (selectedVehicle && activeTab === 'exits') {
      filtered = filtered.filter(record => (record as FuelRecord).vehicle_id.toString() === selectedVehicle)
    }

    return filtered
  }, [activeTab, fuelStockEntries, fuelRecords, searchTerm, dateRange, selectedSupplier, selectedVehicle])

  if (!fuelTank) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Card className="w-96 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-center text-lg text-gray-600">Yakıt deposu bulunamadı.</p>
            <Button className="w-full mt-4" onClick={() => navigate('/fuel-tanks')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleEdit = () => {
    navigate(`/fuel-tank-definition/${id}`)
  }

  const fillRate = (fuelTank.currentAmount / fuelTank.capacity) * 100
  const lastEntry = fuelStockEntries.length > 0 ? fuelStockEntries[fuelStockEntries.length - 1] : null
  const lastExit = fuelRecords.length > 0 ? fuelRecords[fuelRecords.length - 1] : null

  const handleEditRecord = (id: number, isEntry: boolean) => {
    const record = isEntry
      ? fuelStockEntries.find(entry => entry.id === id)
      : fuelRecords.find(record => record.id === id)
    if (record) {
      setEditingRecord(record)
      setIsEditDialogOpen(true)
    }
  }

  const handleDeleteRecord = (id: number) => {
    setDeletingRecordId(id)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingRecordId) {
      const isEntry = fuelStockEntries.some(entry => entry.id === deletingRecordId)
      const tableName = isEntry ? 'fuel_stock_entries' : 'fuel_records'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', deletingRecordId)
      
      if (error) {
        toast({
          title: "Hata",
          description: "Kayıt silinirken bir hata oluştu.",
          variant: "destructive",
        })
      } else {
        if (isEntry) {
          setFuelStockEntries(fuelStockEntries.filter(entry => entry.id !== deletingRecordId))
        } else {
          setFuelRecords(fuelRecords.filter(record => record.id !== deletingRecordId))
        }
        toast({
          title: "Başarılı",
          description: "Kayıt başarıyla silindi.",
        })
      }
    }
    setIsDeleteAlertOpen(false)
    setDeletingRecordId(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRecord) {
      const isEntry = 'supplier' in editingRecord
      const tableName = isEntry ? 'fuel_stock_entries' : 'fuel_records'
      
      // Calculate total
      const total = editingRecord.amount * editingRecord.unit_price

      const updatedRecord = {
        ...editingRecord,
        total,
        date: format(parse(editingRecord.date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd')
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(updatedRecord)
        .eq('id', editingRecord.id)
        .select()
    
      if (error) {
        toast({
          title: "Hata",
          description: "Kayıt güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      } else if (data) {
        if (isEntry) {
          setFuelStockEntries(fuelStockEntries.map(entry => 
            entry.id === editingRecord.id ? data[0] : entry
          ))
        } else {
          setFuelRecords(fuelRecords.map(record => 
            record.id === editingRecord.id ? data[0] : record
          ))
        }
        setIsEditDialogOpen(false)
        toast({
          title: "Başarılı",
          description: "Kayıt başarıyla güncellendi.",
        })
      }
    }
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingRecord) {
      const { name, value } = e.target
      setEditingRecord(prev => ({
        ...prev!,
        [name]: name === 'amount' || name === 'unit_price' ? parseFloat(value) : value
      }))
    }
  }

  const handleEditSelectChange = (name: string, value: string) => {
    if (editingRecord) {
      setEditingRecord(prev => ({
        ...prev!,
        [name]: value
      }))
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{fuelTank.name}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/fuel-tanks')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Geri
          </Button>
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" /> Düzenle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={<Droplet className="h-5 w-5" />}
          title="Mevcut Miktar"
          value={`${fuelTank.currentAmount} Lt`}
        />
        <InfoCard
          icon={<Truck className="h-5 w-5" />}
          title="Kapasite"
          value={`${fuelTank.capacity} Lt`}
        />
        <InfoCard
          icon={<Gauge className="h-5 w-5" />}
          title="Güncel Sayaç"
          value={fuelTank.counterInfo}
        />
        <InfoCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Yakıt Türü"
          value={fuelTank.fuelType}
        />
      </div>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center text-gray-700">
            <Droplet className="mr-2 h-5 w-5" /> Depo Durumu ve Özet
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTankStatus(!showTankStatus)}
          >
            {showTankStatus ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Gizle
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Göster
              </>
            )}
          </Button>
        </CardHeader>
        {showTankStatus && (
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="w-full lg:w-1/2 flex justify-center mb-6 lg:mb-0 pt-8">
                <CircleProgressBar percentage={fillRate} size={300} />
              </div>
              <div className="w-px h-64 bg-gray-200 hidden lg:block"></div>
              <div className="w-full lg:w-1/2 space-y-6 lg:pl-8">
                <SummaryItem
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Toplam Giriş"
                  value={`${fuelStockEntries.reduce((sum, entry) => sum + entry.amount, 0)} Lt`}
                />
                <SummaryItem
                  icon={<TrendingDown className="h-5 w-5" />}
                  label="Toplam Çıkış"
                  value={`${fuelRecords.reduce((sum, exit) => sum + exit.amount, 0)} Lt`}
                />
                <SummaryItem
                  icon={<DollarSign className="h-5 w-5" />}
                  label="Ort. Birim Fiyat"
                  value={`${calculateAveragePrice(fuelStockEntries)} TL/Lt`}
                />
                <SummaryItem
                  icon={<Calendar className="h-5 w-5" />}
                  label="Son 7 Gün Tüketim"
                  value={`${calculateLastWeekConsumption(fuelRecords)} Lt`}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-gray-700">
            <Truck className="mr-2 h-5 w-5" /> Depo Hareketleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="entries" className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="entries">Girişler</TabsTrigger>
              <TabsTrigger value="exits">Çıkışlar</TabsTrigger>
            </TabsList>
            <div className="mb-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Tarih Aralığı
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DateRangePicker
                      onUpdate={handleDateRangeChange}
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" onClick={handleClearDateRange}>
                  <X className="mr-2 h-4 w-4" />
                  Temizle
                </Button>
                {activeTab === 'entries' ? (
                  <Select onValueChange={handleSupplierFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tedarikçi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select onValueChange={handleVehicleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Araç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <TabsContent value="entries">
              <RecordsTable 
                records={filteredRecords as FuelStockEntry[]}
                isEntry={true} 
                vehicles={vehicles}
                suppliers={suppliers}
                sortConfig={sortConfig}
                onSort={handleSort}
                onEdit={handleEditRecord}
                onDelete={handleDeleteRecord}
              />
            </TabsContent>
            <TabsContent value="exits">
              <RecordsTable 
                records={filteredRecords as FuelRecord[]}
                isEntry={false} 
                vehicles={vehicles}
                suppliers={suppliers}
                sortConfig={sortConfig}
                onSort={handleSort}
                onEdit={handleEditRecord}
                onDelete={handleDeleteRecord}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kaydı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Tarih
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={editingRecord?.date ?? ''}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                />
              </div>
              {'supplier' in (editingRecord || {}) ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="supplier" className="text-right">
                    Tedarikçi
                  </Label>
                  <Select
                    value={(editingRecord as FuelStockEntry)?.supplier ?? ''}
                    onValueChange={(value) => handleEditSelectChange('supplier', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Tedarikçi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vehicle_id" className="text-right">
                    Araç
                  </Label>
                  <Select
                    value={(editingRecord as FuelRecord)?.vehicle_id?.toString() ?? ''}
                    onValueChange={(value) => handleEditSelectChange('vehicle_id', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Araç seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Miktar (Lt)
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={editingRecord?.amount ?? ''}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit_price" className="text-right">
                  Birim Fiyat (TL)
                </Label>
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  value={editingRecord?.unit_price ?? ''}
                  onChange={handleEditInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="flex items-center space-x-4 p-6">
        <div className="p-2 bg-primary/10 rounded-full text-primary">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-lg font-semibold text-gray-700">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
      <div className="p-2 bg-primary/10 rounded-full text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-700">{value}</p>
      </div>
    </div>
  )
}

function CircleProgressBar({ percentage, size = 240 }: { percentage: number; size?: number }) {
  const strokeWidth = size / 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-[300px] h-[300px]">
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary transition-all duration-500 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-5xl font-bold text-gray-700">{Math.round(percentage)}%</span>
        <p className="text-lg text-gray-500">Doluluk Oranı</p>
      </div>
    </div>
  )
}

interface RecordsTableProps {
  records: (FuelStockEntry | FuelRecord)[]
  isEntry: boolean
  vehicles: Vehicle[]
  suppliers: Supplier[]
  sortConfig: { key: string; direction: 'ascending' | 'descending' } | null
  onSort: (key: string) => void
  onEdit: (id: number, isEntry: boolean) => void
  onDelete: (id: number) => void
}

function RecordsTable({ records, isEntry, vehicles, suppliers, sortConfig, onSort, onEdit, onDelete }: RecordsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const sortedRecords = useMemo(() => {
    let sortableRecords = [...records]
    if (sortConfig !== null) {
      sortableRecords.sortableRecords.sort((a, b) => {
        if (a[sortConfig.key as keyof(FuelStockEntry | FuelRecord)] < b[sortConfig.key as keyof (FuelStockEntry | FuelRecord)]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key as keyof (FuelStockEntry | FuelRecord)] > b[sortConfig.key as keyof (FuelStockEntry | FuelRecord)]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableRecords
  }, [records, sortConfig])

  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE)
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => onSort('date')}>
                Tarih {sortConfig?.key === 'date' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort(isEntry ? 'supplier' : 'vehicle_id')}>
                {isEntry ? 'Tedarikçi' : 'Araç Plakası'} {sortConfig?.key === (isEntry ? 'supplier' : 'vehicle_id') && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort('amount')}>
                Miktar (Lt) {sortConfig?.key === 'amount' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort('unit_price')}>
                Birim Fiyat (TL) {sortConfig?.key === 'unit_price' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort('total')}>
                Toplam Tutar (TL) {sortConfig?.key === 'total' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
              </TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecords.map((record) => (
              <TableRow key={record.id} className="hover:bg-gray-50">
                <TableCell>{format(new Date(record.date), 'dd.MM.yyyy')}</TableCell>
                <TableCell>
                  {isEntry
                    ? suppliers.find(s => s.id.toString() === (record as FuelStockEntry).supplier)?.value || (record as FuelStockEntry).supplier
                    : vehicles.find(v => v.id === (record as FuelRecord).vehicle_id)?.plate || 'Bilinmeyen Araç'}
                </TableCell>
                <TableCell>{record.amount.toFixed(2)}</TableCell>
                <TableCell>{record.unit_price.toFixed(2)}</TableCell>
                <TableCell>{record.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(record.id, isEntry)} className="mr-2">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(record.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8"
          >
            <span className="sr-only">Previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 2 && page <= currentPage + 2)
            ) {
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8"
                >
                  {page}
                </Button>
              );
            } else if (
              page === currentPage - 3 ||
              page === currentPage + 3
            ) {
              return <span key={page} className="px-2">...</span>;
            }
            return null;
          })}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8"
          >
            <span className="sr-only">Next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Toplam {sortedRecords.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedRecords.length)} arası gösteriliyor
        </div>
      </div>
    </div>
  )
}

function calculateAveragePrice(entries: FuelStockEntry[]): string {
  if (entries.length === 0) return '0.00'
  const totalCost = entries.reduce((sum, entry) => sum + entry.total, 0)
  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0)
  return (totalCost / totalAmount).toFixed(2)
}

function calculateLastWeekConsumption(exits: FuelRecord[]): number {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  return exits
    .filter(exit => new Date(exit.date) >= oneWeekAgo)
    .reduce((sum, exit) => sum + exit.amount, 0)
}

