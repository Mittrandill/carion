'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Printer, FileDown, Search, ArrowUpDown, BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartIcon, Calendar as CalendarIcon, TrendingUp, Droplet, DollarSign } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { format, isValid, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import { tr } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { supabase } from '../lib/supabaseClient'

interface Vehicle {
  id: number
  plate: string
  make: string
  model: string
  currentKm: number
  user_id: string
}

interface FuelRecord {
  id: number
  date: string
  vehicleId: number
  amount: number
  price: number
  station: string
  distance: number
  user_id: string
}

interface MaintenanceRecord {
  id: number
  date: string
  vehicleId: number
  cost: number
  description: string
  user_id: string
}

export default function Reports() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all')
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [activeTab, setActiveTab] = useState('vehicle')
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const { toast } = useToast()
  const ITEMS_PER_PAGE = 10
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const printRef = useRef<HTMLDivElement>(null)

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
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      navigate('/login')
    }
  }

  const fetchData = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [{ data: vehiclesData, error: vehiclesError }, 
             { data: fuelRecordsData, error: fuelRecordsError }, 
             { data: maintenanceRecordsData, error: maintenanceRecordsError }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', userId),
        supabase.from('fuel_records').select('*').eq('user_id', userId).gte('date', startDate.toISOString()).lte('date', endDate.toISOString()),
        supabase.from('service_records').select('*').eq('user_id', userId).gte('date', startDate.toISOString()).lte('date', endDate.toISOString())
      ])

      if (vehiclesError) throw new Error(`Araç verileri alınırken hata oluştu: ${vehiclesError.message}`)
      if (fuelRecordsError) throw new Error(`Yakıt kayıtları alınırken hata oluştu: ${fuelRecordsError.message}`)
      if (maintenanceRecordsError) throw new Error(`Bakım kayıtları alınırken hata oluştu: ${maintenanceRecordsError.message}`)

      setVehicles(vehiclesData || [])
      setFuelRecords(fuelRecordsData || [])
      setMaintenanceRecords(maintenanceRecordsData || [])
    } catch (error) {
      console.error('Veri alınırken hata oluştu:', error)
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, startDate, endDate, toast, navigate])

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [fetchData, userId])

  const filterData = useCallback((data: any[]) => {
    return data.filter(item => {
      const itemDate = new Date(item.date)
      const isAfterStart = itemDate >= startDate
      const isBeforeEnd = itemDate <= endDate
      const matchesVehicle = selectedVehicle === 'all' || item.vehicleId?.toString() === selectedVehicle
      return isAfterStart && isBeforeEnd && matchesVehicle
    })
  }, [startDate, endDate, selectedVehicle])

  const getVehicleReports = useCallback(() => {
    if (!vehicles.length || !fuelRecords.length || !maintenanceRecords.length) {
      return []
    }
    return vehicles.map(vehicle => {
      const vehicleFuelRecords = filterData(fuelRecords).filter(record => record.vehicleId === vehicle.id)
      const vehicleMaintenanceRecords = filterData(maintenanceRecords).filter(record => record.vehicleId === vehicle.id)
    
      const totalDistance = vehicleFuelRecords.reduce((sum, record) => sum + (record.distance || 0), 0)
      const totalFuelConsumption = vehicleFuelRecords.reduce((sum, record) => sum + (record.amount || 0), 0)
      const totalMaintenanceCost = vehicleMaintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0)
      const averageFuelConsumption = totalDistance > 0 ? (totalFuelConsumption / totalDistance) * 100 : 0

      return {
        plate: vehicle.plate,
        totalDistance,
        totalFuelConsumption,
        totalMaintenanceCost,
        averageFuelConsumption
      }
    })
  }, [vehicles, filterData, fuelRecords, maintenanceRecords])

  const getFuelReports = useCallback(() => {
    if (!fuelRecords.length) {
      return { totalFuel: 0, averagePrice: 0, fuelTrends: [], topStations: [] }
    }
    const filteredRecords = filterData(fuelRecords)
    const totalFuel = filteredRecords.reduce((sum, record) => sum + record.amount, 0)
    const averagePrice = filteredRecords.reduce((sum, record) => sum + record.price, 0) / filteredRecords.length || 0

    const fuelTrends = eachMonthOfInterval({ start: startDate, end: endDate }).map(date => {
      const monthRecords = filteredRecords.filter(record => 
        new Date(record.date).getMonth() === date.getMonth() &&
        new Date(record.date).getFullYear() === date.getFullYear()
      )
      return {
        date: format(date, 'MMM yyyy'),
        amount: monthRecords.reduce((sum, record) => sum + record.amount, 0)
      }
    })

    const stationCounts = filteredRecords.reduce((acc, record) => {
      acc[record.station] = (acc[record.station] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topStations = Object.entries(stationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([station, count]) => ({ station, count }))

    return { totalFuel, averagePrice, fuelTrends, topStations }
  }, [filterData, fuelRecords, startDate, endDate])

  const getCostReports = useCallback(() => {
    if (!fuelRecords.length || !maintenanceRecords.length) {
      return { fuelCost: 0, maintenanceCost: 0, totalCost: 0, monthlyCosts: [] }
    }
    const filteredFuelRecords = filterData(fuelRecords)
    const filteredMaintenanceRecords = filterData(maintenanceRecords)

    const fuelCost = filteredFuelRecords.reduce((sum, record) => sum + record.amount * record.price, 0)
    const maintenanceCost = filteredMaintenanceRecords.reduce((sum, record) => sum + record.cost, 0)
    const totalCost = fuelCost + maintenanceCost

    const monthlyCosts = eachMonthOfInterval({ start: startDate, end: endDate }).map(date => {
      const monthFuelRecords = filteredFuelRecords.filter(record => 
        new Date(record.date).getMonth() === date.getMonth() &&
        new Date(record.date).getFullYear() === date.getFullYear()
      )
      const monthMaintenanceRecords = filteredMaintenanceRecords.filter(record => 
        new Date(record.date).getMonth() === date.getMonth() &&
        new Date(record.date).getFullYear() === date.getFullYear()
      )
      return {
        date: format(date, 'MMM yyyy'),
        fuelCost: monthFuelRecords.reduce((sum, record) => sum + record.amount * record.price, 0),
        maintenanceCost: monthMaintenanceRecords.reduce((sum, record) => sum + record.cost, 0)
      }
    })

    return { fuelCost, maintenanceCost, totalCost, monthlyCosts }
  }, [filterData, fuelRecords, maintenanceRecords, startDate, endDate])

  const getTimeBasedReports = useCallback(() => {
    if (!fuelRecords.length) {
      return []
    }
    const filteredFuelRecords = filterData(fuelRecords)
    return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => {
      const monthRecords = filteredFuelRecords.filter(record => 
        new Date(record.date).getMonth() === date.getMonth() &&
        new Date(record.date).getFullYear() === date.getFullYear()
      )
      return {
        date: format(date, 'MMM yyyy'),
        fuelConsumption: monthRecords.reduce((sum, record) => sum + record.amount, 0),
        cost: monthRecords.reduce((sum, record) => sum + record.amount * record.price, 0)
      }
    })
  }, [filterData, fuelRecords, startDate, endDate])

  const getSummaryReports = useCallback(() => {
    const vehicleReports = getVehicleReports()
    if (!vehicleReports.length) {
      return {
        mostFuelConsuming: null,
        highestMaintenanceCost: null,
        mostEfficient: null
      }
    }
    return {
      mostFuelConsuming: vehicleReports.reduce((max, report) => 
        report.totalFuelConsumption > max.totalFuelConsumption ? report : max
      ),
      highestMaintenanceCost: vehicleReports.reduce((max, report) => 
        report.totalMaintenanceCost > max.totalMaintenanceCost ? report : max
      ),
      mostEfficient: vehicleReports.reduce((min, report) => 
        report.averageFuelConsumption < min.averageFuelConsumption ? report : min
      ),
    }
  }, [getVehicleReports])

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const handleExcelExport = () => {
    const exportData = getVehicleReports().map(report => ({
      'Plaka': report.plate,
      'Toplam Mesafe (km)': report.totalDistance.toFixed(2),
      'Toplam Yakıt Tüketimi (L)': report.totalFuelConsumption.toFixed(2),
      'Toplam Bakım Maliyeti (TL)': report.totalMaintenanceCost.toFixed(2),
      'Ortalama Yakıt Tüketimi (L/100km)': report.averageFuelConsumption.toFixed(2),
    }))

    const fuelReports = getFuelReports()
    exportData.push({
      'Plaka': 'Toplam Yakıt Tüketimi',
      'Toplam Mesafe (km)': '',
      'Toplam Yakıt Tüketimi (L)': fuelReports.totalFuel.toFixed(2),
      'Toplam Bakım Maliyeti (TL)': '',
      'Ortalama Yakıt Tüketimi (L/100km)': '',
    })
    exportData.push({
      'Plaka': 'Ortalama Yakıt Fiyatı',
      'Toplam Mesafe (km)': '',
      'Toplam Yakıt Tüketimi (L)': '',
      'Toplam Bakım Maliyeti (TL)': fuelReports.averagePrice.toFixed(2),
      'Ortalama Yakıt Tüketimi (L/100km)': '',
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Araç Raporları")

    // En çok kullanılan yakıt istasyonları
    const topStationsData = fuelReports.topStations.map(station => ({
      'İstasyon': station.station,
      'Kullanım Sayısı': station.count
    }))
    const wsStations = XLSX.utils.json_to_sheet(topStationsData)
    XLSX.utils.book_append_sheet(wb, wsStations, "En Çok Kullanılan İstasyonlar")

    XLSX.writeFile(wb, "arac_raporlari.xlsx")
  }

  const handlePdfExport = () => {
    const doc = new jsPDF()
    
    doc.text("Araç Yönetim Raporları", 14, 15)
    
    const vehicleReportsData = getVehicleReports().map(report => [
      report.plate,
      report.totalDistance.toFixed(2),
      report.totalFuelConsumption.toFixed(2),
      report.totalMaintenanceCost.toFixed(2),
      report.averageFuelConsumption.toFixed(2)
    ])
    
    doc.autoTable({
      head: [['Plaka', 'Toplam KM', 'Yakıt Tüketimi (L)', 'Bakım Maliyeti (TL)', 'Ort. Yakıt Tüketimi (L/100km)']],
      body: vehicleReportsData,
      startY: 20,
    })
    
    const fuelReports = getFuelReports()
    doc.text(`Toplam Yakıt Tüketimi: ${fuelReports.totalFuel.toFixed(2)} L`, 14, doc.lastAutoTable.finalY + 10)
    doc.text(`Ortalama Yakıt Fiyatı: ${fuelReports.averagePrice.toFixed(2)} TL/L`, 14, doc.lastAutoTable.finalY + 20)
    
    doc.addPage()
    
    doc.text("En Çok Kullanılan Yakıt İstasyonları", 14, 15)
    const topStationsData = fuelReports.topStations.map(station => [station.station, station.count.toString()])
    doc.autoTable({
      head: [['İstasyon', 'Kullanım Sayısı']],
      body: topStationsData,
      startY: 20,
    })
    
    doc.save("arac_raporlari.pdf")
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const originalContent = document.body.innerHTML
      document.body.innerHTML = printContent
      window.print()
      document.body.innerHTML = originalContent
    }
  }

  const filteredReports = getVehicleReports().filter(report =>
    report.plate.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedReports = React.useMemo(() => {
    let sortableReports = [...filteredReports]
    if (sortConfig !== null) {
      sortableReports.sort((a, b) => {
        if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableReports
  }, [filteredReports, sortConfig])

  const paginatedReports = sortedReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(sortedReports.length / ITEMS_PER_PAGE)

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>
  }

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Araç Yönetim Raporları</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {format(startDate, "d MMMM yyyy", { locale: tr })}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {format(endDate, "d MMMM yyyy", { locale: tr })}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Araç</label>
              <Select onValueChange={setSelectedVehicle} value={selectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Araç Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Araçlar</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rapor Türü</label>
              <Select onValueChange={(value) => setReportType(value as any)} value={reportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Rapor Türü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                  <SelectItem value="monthly">Aylık</SelectItem>
                  <SelectItem value="yearly">Yıllık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Input
              placeholder="Plakaya göre ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="space-x-2">
              <Button onClick={handleExcelExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Excel'e Aktar
              </Button>
              <Button onClick={handlePdfExport}>
                <FileDown className="mr-2 h-4 w-4" />
                PDF'e Aktar
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Yazdır
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={printRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="vehicle">Araç Bazlı</TabsTrigger>
            <TabsTrigger value="fuel">Yakıt</TabsTrigger>
            <TabsTrigger value="cost">Maliyet</TabsTrigger>
            <TabsTrigger value="time">Zaman Bazlı</TabsTrigger>
            <TabsTrigger value="summary">Özet</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicle">
            <Card>
              <CardHeader>
                <CardTitle>Araç Bazlı Raporlar</CardTitle>
                <CardDescription>Tüm araçların detaylı performans ve maliyet analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('plate')}>
                        Plaka {sortConfig?.key === 'plate' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('totalDistance')}>
                        Toplam KM {sortConfig?.key === 'totalDistance' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('totalFuelConsumption')}>
                        Yakıt Tüketimi {sortConfig?.key === 'totalFuelConsumption' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('totalMaintenanceCost')}>
                        Bakım Maliyetleri {sortConfig?.key === 'totalMaintenanceCost' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('averageFuelConsumption')}>
                        Ort. Yakıt Tüketimi {sortConfig?.key === 'averageFuelConsumption' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => (
                      <TableRow key={report.plate}>
                        <TableCell className="font-medium">{report.plate}</TableCell>
                        <TableCell>{report.totalDistance.toFixed(2)} km</TableCell>
                        <TableCell>{report.totalFuelConsumption.toFixed(2)} L</TableCell>
                        <TableCell>{report.totalMaintenanceCost.toFixed(2)} TL</TableCell>
                        <TableCell>{report.averageFuelConsumption.toFixed(2)} L/100km</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-between items-center">
                  <div className="space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">
                    Toplam {sortedReports.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedReports.length)} arası gösteriliyor
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fuel">
            <Card>
              <CardHeader>
                <CardTitle>Yakıt Raporları</CardTitle>
                <CardDescription>Yakıt tüketimi ve maliyeti ile ilgili detaylı analizler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Yakıt Tüketimi</CardTitle>
                      <Droplet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getFuelReports().totalFuel.toFixed(2)} L</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ortalama Yakıt Fiyatı</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getFuelReports().averagePrice.toFixed(2)} TL/L</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Aylık Yakıt Tüketim Trendi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={getFuelReports().fuelTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" name="Yakıt Tüketimi (L)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>En Çok Kullanılan Yakıt İstasyonları</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getFuelReports().topStations}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="station" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" name="Kullanım Sayısı">
                            {getFuelReports().topStations.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cost">
            <Card>
              <CardHeader>
                <CardTitle>Maliyet Raporları</CardTitle>
                <CardDescription>Yakıt ve bakım maliyetlerinin detaylı analizi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Toplam Maliyet</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getCostReports().totalCost.toFixed(2)} TL</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Yakıt Maliyeti</CardTitle>
                      <Droplet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getCostReports().fuelCost.toFixed(2)} TL</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Bakım Maliyeti</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getCostReports().maintenanceCost.toFixed(2)} TL</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Maliyet Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Yakıt Maliyeti', value: getCostReports().fuelCost },
                              { name: 'Bakım Maliyeti', value: getCostReports().maintenanceCost }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {
                              [
                                { name: 'Yakıt Maliyeti', value: getCostReports().fuelCost },
                                { name: 'Bakım Maliyeti', value: getCostReports().maintenanceCost }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))
                            }
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Aylık Maliyet Trendi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={getCostReports().monthlyCosts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="fuelCost" stroke="#8884d8" name="Yakıt Maliyeti" />
                          <Line type="monotone" dataKey="maintenanceCost" stroke="#82ca9d" name="Bakım Maliyeti" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time">
            <Card>
              <CardHeader>
                <CardTitle>Zaman Bazlı Raporlar</CardTitle>
                <CardDescription>Yakıt tüketimi ve maliyetlerinin zaman içindeki değişimi</CardDescription>
              </CardHeader>
              <CardContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Aylık Yakıt Tüketimi ve Maliyet Trendi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={getTimeBasedReports()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="fuelConsumption" stroke="#8884d8" name="Yakıt Tüketimi (L)" />
                        <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#82ca9d" name="Maliyet (TL)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Özet Raporlar</CardTitle>
                <CardDescription>Filo performansının genel değerlendirmesi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(getSummaryReports()).map(([key, value], index) => (
                    value && (
                      <Card key={key} className="overflow-hidden">
                        <CardHeader className={`${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-yellow-500' : 'bg-green-500'} text-white`}>
                          <CardTitle className="text-lg">
                            {key === 'mostFuelConsuming' ? 'En Çok Yakıt Tüketen' : key === 'highestMaintenanceCost' ? 'En Yüksek Bakım Maliyeti' : 'En Verimli'} Araç
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <p className="font-medium text-lg mb-2">Plaka: {value.plate}</p>
                          <p>Toplam Yakıt Tüketimi: {value.totalFuelConsumption.toFixed(2)} L</p>
                          <p>Toplam Bakım Maliyeti: {value.totalMaintenanceCost.toFixed(2)} TL</p>
                          <p>Ortalama Yakıt Tüketimi: {value.averageFuelConsumption.toFixed(2)} L/100km</p>
                        </CardContent>
                      </Card>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}