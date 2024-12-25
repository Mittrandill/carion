'use client'

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { FileDown, ArrowUpDown, ChevronLeft, ChevronRight, Fuel, Banknote, Car, BarChart3 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useToast } from "@/components/ui/use-toast"

interface FuelRecord {
  id: number
  date: string
  vehicle_id: number
  tank_id: number | null
  amount: number
  unit_price: number
  total: number
  vehicles: { plate: string }
  fuel_tanks: { name: string } | null
}

export default function FuelExits() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: keyof FuelRecord; direction: 'ascending' | 'descending' } | null>(null)

  const ITEMS_PER_PAGE = 7

  useEffect(() => {
    fetchUserIdAndData()
  }, [])

  const fetchUserIdAndData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      fetchData(user.id)
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      navigate('/login')
    }
  }

  const fetchData = async (userId: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('fuel_records')
        .select(`
          *,
          vehicles (plate),
          fuel_tanks (name)
        `)
        .eq('user_id', userId)
        .eq('station_type', 'internal')
        .eq('counter_type', 'withoutCounter')
        .order('date', { ascending: false })

      if (error) throw error
      setFuelRecords(data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (key: keyof FuelRecord) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const handleExcelExport = () => {
    const exportData = filteredAndSortedRecords.map(record => ({
      'Tarih': format(new Date(record.date), 'dd.MM.yyyy'),
      'Araç Plakası': record.vehicles.plate,
      'Depo': record.fuel_tanks?.name || 'N/A',
      'Miktar (Lt)': record.amount.toFixed(2),
      'Birim Fiyat (TL)': record.unit_price.toFixed(2),
      'Tutar (TL)': record.total.toFixed(2),
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sayaçsız Yakıt Çıkışları")
    XLSX.writeFile(wb, "sayacsiz_yakit_cikislari.xlsx")
  }

  const filteredAndSortedRecords = React.useMemo(() => {
    if (!fuelRecords) return [];

    let result = fuelRecords.filter(record => 
      (filterVehicle === 'all' || record.vehicle_id.toString() === filterVehicle) &&
      (record.vehicles.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (record.fuel_tanks?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return result
  }, [fuelRecords, filterVehicle, searchTerm, sortConfig])

  const uniqueVehicles = React.useMemo(() => {
    return Array.from(new Set(fuelRecords.map(record => ({ id: record.vehicle_id, plate: record.vehicles.plate }))))
  }, [fuelRecords])

  const totalPages = Math.ceil(filteredAndSortedRecords.length / ITEMS_PER_PAGE)
  const paginatedRecords = filteredAndSortedRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Calculate statistics for the cards
  const stats = React.useMemo(() => {
    if (!fuelRecords) return {
      totalAmount: 0,
      totalCost: 0,
      uniqueVehicles: 0,
      averageConsumption: 0
    };

    const totalAmount = fuelRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalCost = fuelRecords.reduce((sum, record) => sum + record.total, 0);
    const uniqueVehiclesCount = new Set(fuelRecords.map(record => record.vehicle_id)).size;
    const averageConsumption = totalAmount / fuelRecords.length || 0;

    return {
      totalAmount: totalAmount,
      totalCost: totalCost,
      uniqueVehicles: uniqueVehiclesCount,
      averageConsumption: averageConsumption
    };
  }, [fuelRecords]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>
  }

  if (!userId) {
    return <div className="flex items-center justify-center h-screen">Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sayaçsız Yakıt Çıkışları</h1>
        <div className="space-x-2">
          <Button onClick={handleExcelExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Kayıtları Dışarı Aktar
          </Button>
        </div>
      </div>

      {/* Informative Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yakıt</CardTitle>
            <Fuel className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} Lt</div>
            <p className="text-xs text-blue-500">Toplam yakıt çıkışı</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Maliyet</CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCost.toFixed(2)} ₺</div>
            <p className="text-xs text-green-500">Toplam yakıt maliyeti</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Araç Sayısı</CardTitle>
            <Car className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueVehicles}</div>
            <p className="text-xs text-yellow-500">Yakıt alan benzersiz araç sayısı</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Tüketim</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageConsumption.toFixed(2)} Lt</div>
            <p className="text-xs text-orange-500">Çıkış başına ortalama yakıt miktarı</p>
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
            {uniqueVehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.plate}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    <TableHead>Araç Plakası</TableHead>
                    <TableHead>Depo</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                      Miktar (Lt) {sortConfig?.key === 'amount' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('unit_price')}>
                      Birim Fiyat (TL) {sortConfig?.key === 'unit_price' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('total')}>
                      Tutar (TL) {sortConfig?.key === 'total' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id} className="cursor-pointer hover:bg-gray-100">
                      <TableCell>{format(new Date(record.date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{record.vehicles.plate}</TableCell>
                      <TableCell>{record.fuel_tanks?.name || 'N/A'}</TableCell>
                      <TableCell>{record.amount.toFixed(2)}</TableCell>
                      <TableCell>{record.unit_price.toFixed(2)}</TableCell>
                      <TableCell>{record.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">Henüz sayaçsız yakıt çıkışı kaydı bulunmamaktadır.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
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
    </div>
  )
}

