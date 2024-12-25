import React, { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Pagination } from "@/components/ui/pagination"
import { format, parse, isValid  } from "date-fns"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Plus, Edit, Trash2, ArrowUpDown, FileUp, FileDown, Download, Upload, X, Droplet, DollarSign, TrendingUp, Truck, ChevronDown, Settings } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FuelRecord {
  id: number;
  date: string;
  vehicle_id: number;
  tank_id: number | null;
  station: string;
  amount: number;
  unit_price: number;
  total: number;
  receipt_no: string;
  station_type: 'internal' | 'external';
  fuel_type: string;
  user_id: string;
  counter_type: 'withCounter' | 'withoutCounter' | null;
}

interface Vehicle {
  id: number;
  plate: string;
}

interface FuelTank {
  id: number;
  name: string;
}

interface Station {
  id: string;
  value: string;
}

export default function FuelRecords() {
  const navigate = useNavigate();
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelTanks, setFuelTanks] = useState<FuelTank[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importedRecordsCount, setImportedRecordsCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const [isAddFuelDialogOpen, setIsAddFuelDialogOpen] = useState(false)
  const [isAddToTankDialogOpen, setIsAddToTankDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 7

  useEffect(() => {
    fetchUserSession()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchFuelRecords()
      fetchVehicles()
      fetchFuelTanks()
      fetchStations()
    }
  }, [userId])

  const fetchUserSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error fetching user session:', error)
      return
    }
    if (session?.user) {
      setUserId(session.user.id)
    }
  }

  const fetchFuelRecords = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching fuel records:', error)
      toast({
        title: "Error",
        description: "Failed to fetch fuel records. Please try again.",
        variant: "destructive",
      })
    } else {
      setFuelRecords(data || [])
    }
  }

  const fetchVehicles = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching vehicles:', error)
      toast({
        title: "Error",
        description: "Failed to fetch vehicles. Please try again.",
        variant: "destructive",
      })
    } else {
      setVehicles(data || [])
    }
  }

  const fetchFuelTanks = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('fuel_tanks')
      .select('id, name')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching fuel tanks:', error)
      toast({
        title: "Error",
        description: "Failed to fetch fuel tanks. Please try again.",
        variant: "destructive",
      })
    } else {
      setFuelTanks(data || [])
    }
  }

  const fetchStations = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('type', 'stations')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching stations:', error)
    } else {
      setStations(data || [])
    }
  }

  const getStationName = (stationType: string, stationId: string | null, tankId: number | null) => {
    if (stationType === 'internal') {
      return fuelTanks.find(tank => tank.id === tankId)?.name || '-'
    } else {
      return stations.find(station => station.id === stationId)?.value || stationId || '-'
    }
  }

  const filteredAndSortedRecords = useMemo(() => {
    let result = fuelRecords.filter((record: FuelRecord) => {
      const stationName = getStationName(record.station_type, record.station, record.tank_id)
      return (stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicles.find(v => v.id === record.vehicle_id)?.plate.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterVehicle === 'all' || record.vehicle_id?.toString() === filterVehicle)
    })

    if (sortConfig !== null) {
      result.sort((a: FuelRecord, b: FuelRecord) => {
        if (sortConfig.key === 'station') {
          const stationA = getStationName(a.station_type, a.station, a.tank_id)
          const stationB = getStationName(b.station_type, b.station, b.tank_id)
          return sortConfig.direction === 'ascending' 
            ? stationA.localeCompare(stationB)
            : stationB.localeCompare(stationA)
        }

        if (a[sortConfig.key as keyof FuelRecord] < b[sortConfig.key as keyof FuelRecord]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key as keyof FuelRecord] > b[sortConfig.key as keyof FuelRecord]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return result
  }, [fuelRecords, searchTerm, filterVehicle, sortConfig, vehicles, fuelTanks, stations])

  const totalFuelAmount = useMemo(() => {
    return filteredAndSortedRecords.reduce((sum, record) => sum + record.amount, 0)
  }, [filteredAndSortedRecords])

  const totalCost = useMemo(() => {
    return filteredAndSortedRecords.reduce((sum, record) => sum + record.total, 0)
  }, [filteredAndSortedRecords])

  const averageUnitPrice = useMemo(() => {
    return totalFuelAmount > 0 ? totalCost / totalFuelAmount : 0
  }, [totalFuelAmount, totalCost])

  const mostUsedVehicle = useMemo(() => {
    if (filteredAndSortedRecords.length === 0) return null;
    const vehicleUsage = filteredAndSortedRecords.reduce((acc, record) => {
      if (record.vehicle_id) {
        acc[record.vehicle_id] = (acc[record.vehicle_id] || 0) + record.amount
      }
      return acc
    }, {} as Record<number, number>)

    const mostUsedVehicleId = Object.entries(vehicleUsage).reduce((a, b) => a[1] > b[1] ? a : b, ['0', 0])[0]
    return vehicles.find(v => v.id === parseInt(mostUsedVehicleId)) || null
  }, [filteredAndSortedRecords, vehicles])

  const paginatedRecords = filteredAndSortedRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(filteredAndSortedRecords.length / ITEMS_PER_PAGE)

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const handleEdit = (record: FuelRecord) => {
    // Tarihi YYYY-MM-DD formatına çevirelim
    const formattedDate = format(new Date(record.date), 'yyyy-MM-dd')
    setEditingRecord({...record, date: formattedDate})
    setIsEditDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingRecordId(id)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingRecordId) {
      const { error } = await supabase
        .from('fuel_records')
        .delete()
        .eq('id', deletingRecordId)
        .eq('user_id', userId)
      if (error) {
        toast({
          title: "Hata",
          description: "Yakıt kaydı silinirken bir hata oluştu.",
          variant: "destructive",
        })
      } else {
        setFuelRecords(fuelRecords.filter(record => record.id !== deletingRecordId))
        toast({
          title: "Başarılı",
          description: "Yakıt kaydı başarıyla silindi.",
        })
      }
    }
    setIsDeleteAlertOpen(false)
    setDeletingRecordId(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRecord && userId) {
      // Tarihi ISO formatına çevirelim
      const isoDate = new Date(editingRecord.date).toISOString()
      const { id, ...updatedRecord } = { ...editingRecord, date: isoDate }

      const { data, error } = await supabase
        .from('fuel_records')
        .update(updatedRecord)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
    
      if (error) {
        console.error('Error updating record:', error)
        toast({
          title: "Hata",
          description: "Yakıt kaydı güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      } else if (data) {
        setFuelRecords(fuelRecords.map(record => 
          record.id === editingRecord.id ? data[0] : record
        ))
        setIsEditDialogOpen(false)
        toast({
          title: "Başarılı",
          description: "Yakıt kaydı başarıyla güncellendi.",
        })
      }
    }
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) {
      toast({
        title: "Hata",
        description: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
        variant: "destructive",
      })
      return
    }

    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result
          const wb = XLSX.read(bstr, { type: 'binary' })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) // Use header: 1 to get array of arrays
        
          // Skip the first two rows (instruction and headers)
          const records = data.slice(2).filter(row => row.length > 0) // Filter out empty rows
          
          const importedRecords = records.map((record: any, index: number) => {
            // Get values from specific columns
            const plateValue = record[1] // Araç Plakası is in second column
            if (!plateValue) {
              throw new Error('Araç plakası boş olamaz')
            }

            const vehicle = vehicles.find(v => v.plate === plateValue)
            if (!vehicle) {
              throw new Error(`Geçersiz araç plakası: ${plateValue}`)
            }

            setImportProgress((index + 1) / records.length * 100)
            setImportedRecordsCount(index + 1)

            // Find station ID or tank ID based on station type
            const stationType = record[3]?.toLowerCase()
            let stationId = null
            let tankId = null

            if (stationType === 'internal') {
              // For internal type, look up the tank by name (case-insensitive)
              const tank = fuelTanks.find(t => t.name.toLowerCase() === record[2].toString().toLowerCase())
              if (!tank) {
                throw new Error(`Geçersiz depo adı: ${record[2]}`)
              }
              tankId = tank.id
            } else {
              // For external type, use existing station lookup
              const station = stations.find(s => s.value === record[2])
              stationId = station ? station.id : record[2]
            }

            // Parse and format the date correctly
            const parseDate = (dateStr: string): string => {
              if (!dateStr) {
                throw new Error('Tarih boş olamaz')
              }

              // Try parsing as DD.MM.YYYY
              let date = parse(dateStr.toString(), 'dd.MM.yyyy', new Date())
              if (isValid(date)) {
                return format(date, 'yyyy-MM-dd')
              }

              // Try parsing as YYYY-MM-DD
              date = parse(dateStr.toString(), 'yyyy-MM-dd', new Date())
              if (isValid(date)) {
                return format(date, 'yyyy-MM-dd')
              }

              // If it's a number, treat it as an Excel serial date
              const serialDate = parseFloat(dateStr.toString())
              if (!isNaN(serialDate)) {
                date = new Date((serialDate - 25569) * 86400 * 1000)
                if (isValid(date)) {
                  return format(date, 'yyyy-MM-dd')
                }
              }

              throw new Error(`Geçersiz tarih formatı: ${dateStr}`)
            }

            const formattedDate = parseDate(record[0]) // Tarih is in first column
          
            return {
              date: formattedDate,
              vehicle_id: vehicle.id,
              station: stationId,
              tank_id: tankId,
              station_type: stationType === 'internal' ? 'internal' : 'external',
              counter_type: stationType === 'external' ? null : (record[4] || 'withCounter'),
              fuel_type: record[5],
              amount: parseFloat(record[6]),
              unit_price: parseFloat(record[7]),
              total: parseFloat(record[8]),
              user_id: userId
            }
          })

          if (importedRecords.length > 0) {
            const { data: insertedData, error } = await supabase
              .from('fuel_records')
              .insert(importedRecords)
              .select()
            
            if (error) throw error
            
            setFuelRecords([...fuelRecords, ...(insertedData || [])])
            toast({
              title: "Başarılı",
              description: `${importedRecords.length} kayıt başarıyla içe aktarıldı.`,
            })
            setIsImportDialogOpen(false)
            setImportProgress(0)
            setImportedRecordsCount(0)
          } else {
            toast({
              title: "Uyarı",
              description: "İçe aktarılacak geçerli kayıt bulunamadı. Lütfen dosyanızı kontrol edin.",
              variant: "default",
            })
            setImportProgress(0)
            setImportedRecordsCount(0)
          }
        } catch (error) {
          console.error('Import error:', error)
          let errorMessage = 'Veriler içe aktarılırken bir hata oluştu.'
          if (error instanceof Error) {
            errorMessage += ' ' + error.message
          }
          toast({
            title: "Hata",
            description: errorMessage,
            variant: "destructive",
          })
          setImportProgress(0)
          setImportedRecordsCount(0)
        }
      }
      reader.readAsBinaryString(file)
    }
  }

  const handleExcelExport = () => {
    const exportData = filteredAndSortedRecords.map(record => ({
      'Tarih': format(new Date(record.date), 'dd.MM.yyyy'),
      'Araç Plakası': vehicles.find(v => v.id === record.vehicle_id)?.plate || '',
      'İstasyon': getStationName(record.station_type, record.station, record.tank_id),
      'İstasyon Tipi': record.station_type,
      'Miktar (Lt)': record.amount.toFixed(2),
      'Birim Fiyat (TL)': record.unit_price.toFixed(2),
      'Toplam (TL)': record.total.toFixed(2),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Yakıt Kayıtları")
    XLSX.writeFile(wb, "yakit_kayitlari.xlsx")
  }

  const handleTemplateDownload = () => {
    const template = [
      {
        'Tarih': 'Araç Plakalarını Sisteme kayıt ettiğiniz şekilde giriniz. Boşluk bırakarak girdiyseniz boşluk bırakarak girmeniz gerekmektedir. İstasyon tipi sütununa eğer dışarıdan bir alım yaptıysanız "external" dahili stoktan alım yaptıysanız "internal" olarak giriniz. Sayaç Tipi kısmını dışarıdan alım yaptıysanız boş bırakabilirsiniz. Eğer stok tipi dahili deponuzdan ise sayaçtan geçtiyse "withCounter" geçmediyse "withoutCounter" olarak giriniz.',
        'Araç Plakası': '',
        'İstasyon': '',
        'İstasyon Tipi': '',
        'Sayaç Tipi': '',
        'Yakıt Tipi': '',
        'Miktar (Lt)': '',
        'Birim Fiyat (TL)': '',
        'Toplam (TL)': ''
      },
      {
        'Tarih': '01.01.2023',
        'Araç Plakası': '34 ABC 123',
        'İstasyon': 'Örnek İstasyon',
        'İstasyon Tipi': 'external',
        'Sayaç Tipi': 'withCounter',
        'Yakıt Tipi': 'Dizel',
        'Miktar (Lt)': '50.00',
        'Birim Fiyat (TL)': '20.00',
        'Toplam (TL)': '1000.00'
      }
    ]

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(template, { skipHeader: true })

    // Merge cells for the instruction row (A1:I1)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }
    ]

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Tarih
      { wch: 15 },  // Araç Plakası
      { wch: 20 },  // İstasyon
      { wch: 15 },  // İstasyon Tipi
      { wch: 15 },  // Sayaç Tipi
      { wch: 12 },  // Yakıt Tipi
      { wch: 12 },  // Miktar
      { wch: 15 },  // Birim Fiyat
      { wch: 15 }   // Toplam
    ]

    // Set row height for the instruction row
    ws['!rows'] = [{ hpt: 100 }] // Approximately 75 pixels

    // Define styles
    const instructionStyle = {
      font: { name: 'Calibri', sz: 12 },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    }

    const headerStyle = {
      font: { name: 'Calibri', sz: 12, bold: true },
      alignment: { horizontal: 'center' }
    }

    const dataStyle = {
      font: { name: 'Calibri', sz: 12 },
      alignment: { horizontal: 'left' }
    }

    // Apply styles to instruction row
    for (let i = 0; i <= 8; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i })
      ws[cellRef].s = instructionStyle
    }

    // Apply styles to header row
    const headers = ['Tarih', 'Araç Plakası', 'İstasyon', 'İstasyon Tipi', 'Sayaç Tipi', 'Yakıt Tipi', 'Miktar (Lt)', 'Birim Fiyat (TL)', 'Toplam (TL)']
    headers.forEach((header, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 1, c: i })
      ws[cellRef] = { v: header, t: 's', s: headerStyle }
    })

    // Apply styles to sample data row
    for (let i = 0; i <= 8; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 2, c: i })
      if (ws[cellRef]) {
        ws[cellRef].s = dataStyle
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Şablon")
    XLSX.writeFile(wb, "yakit_kayitlari_sablonu.xlsx")
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Akaryakıt Kayıtları</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between">
              İşlemler <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]" align="end">
            <DropdownMenuItem onSelect={() => navigate('/vehicle-fuel-entry')}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Araca Yakıt Girişi</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/fuel-tank-entry')}>
              <Droplet className="mr-2 h-4 w-4" />
              <span>Depoya Yakıt Girişi</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Ayarlar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yakıt Miktarı</CardTitle>
            <Droplet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFuelAmount.toFixed(2)} Lt</div>
            <p className="text-xs text-blue-500">Tüm kayıtlar için toplam yakıt miktarı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Maliyet</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCost.toFixed(2)} TL</div>
            <p className="text-xs text-green-500">Tüm kayıtlar için toplam yakıt maliyeti</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Birim Fiyat</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageUnitPrice.toFixed(2)} TL/Lt</div>
            <p className="text-xs text-yellow-500">Tüm kayıtlar için ortalama yakıt fiyatı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Çok Yakıt Alan Araç</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostUsedVehicle?.plate || 'N/A'}</div>
            <p className="text-xs text-orange-500">En fazla yakıt tüketen araç</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
        <div className="flex-1 w-full md:w-auto">
          <Input
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select onValueChange={setFilterVehicle} value={filterVehicle}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Araç Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Araçlar</SelectItem>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.plate}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex space-x-2">
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" /> İçe Aktar
          </Button>
          <Button onClick={handleExcelExport}>
            <FileDown className="mr-2 h-4 w-4" /> Dışa Aktar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {paginatedRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                      Tarih {sortConfig?.key === 'date' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('vehicle_id')}>
                      Araç Plakası {sortConfig?.key === 'vehicle_id' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('receipt_no')}>
                      Matbu Fiş/Fatura No {sortConfig?.key === 'receipt_no' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('station')}>
                      İstasyon/Depo {sortConfig?.key === 'station' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                      Miktar (Lt) {sortConfig?.key === 'amount' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('unit_price')}>
                      Birim Fiyat (TL) {sortConfig?.key === 'unit_price' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('total')}>
                      Toplam (TL) {sortConfig?.key === 'total' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{vehicles.find(v => v.id === record.vehicle_id)?.plate || '-'}</TableCell>
                      <TableCell>{record.receipt_no || '-'}</TableCell>
                      <TableCell>
                        {getStationName(record.station_type, record.station, record.tank_id)}
                      </TableCell>
                      <TableCell>{record.amount.toFixed(2)}</TableCell>
                      <TableCell>{record.unit_price.toFixed(2)}</TableCell>
                      <TableCell>{record.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">Henüz yakıt kaydı bulunmamaktadır.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8"
          >
            <span className="sr-only">Previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current page
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
          Toplam {filteredAndSortedRecords.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedRecords.length)} arası gösteriliyor
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yakıt Kaydını Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Tarih
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={editingRecord?.date ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, date: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receipt_no" className="text-right">
                  Matbu Fiş/Fatura No
                </Label>
                <Input
                  id="receipt_no"
                  value={editingRecord?.receipt_no ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, receipt_no: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="station" className="text-right">
                  İstasyon/Depo
                </Label>
                <Input
                  id="station"
                  value={editingRecord ? getStationName(editingRecord.station_type, editingRecord.station, editingRecord.tank_id) : ''}
                  onChange={(e) => {
                    const station = stations.find(s => s.value === e.target.value)
                    setEditingRecord(prev => prev ? {
                      ...prev,
                      station: station ? station.id : e.target.value
                    } : null)
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Miktar (Lt)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01 "
                  value={editingRecord?.amount ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, amount: parseFloat(e.target.value)} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit_price" className="text-right">
                  Birim Fiyat (TL)
                </Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={editingRecord?.unit_price ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, unit_price: parseFloat(e.target.value)} : null)}
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
              Bu yakıt kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Yakıt Kayıtlarını İçeri Aktar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="flex justify-center items-center w-full space-x-8">
              <div className="text-center">
                <Download className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium">Excel şablonunu indirin</p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-gray-300" />
              <div className="text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium">Doldurulmuş şablonu yükleyin</p>
              </div>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray600 max-w-md">
              <li>Hazırladığımız Excel şablonunu indirin.</li>
              <li>Yakıt kayıtlarınızı şablona aktarın.</li>
              <li>Araç plakalarını doğru girdiğinizden emin olun.</li>
              <li>Doldurulan şablonu yükleyin.</li>
            </ol>
            {importProgress > 0 && (
              <div className="w-full space-y-2">
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-center">{importedRecordsCount} kayıt işlendi</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Vazgeç
            </Button>
            <div className="space-x-2">
              <Button onClick={handleTemplateDownload}>
                <Download className="mr-2 h-4 w-4" />
                Şablonu İndir
              </Button>
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Şablonu Yükle
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                  />
                </label>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
