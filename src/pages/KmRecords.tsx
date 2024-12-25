'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label'
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, ArrowUpDown, CalendarIcon, CarIcon, ClockIcon, ChevronLeft, ChevronRight, Car, BarChart3, Activity, Timer, Search } from 'lucide-react'
import { format } from "date-fns"
import { tr } from 'date-fns/locale'

interface KmRecord {
  id: number
  vehicle_id: number
  km: number
  date: string
  user_id: string
  vehicle?: Vehicle
}

interface Vehicle {
  id: number
  plate: string
  make: string
  model: string
  user_id: string
}

interface StatsData {
  totalVehicles: number
  totalRecords: number
  averageKmPerRecord: number
  latestUpdate: string | null
}

export default function KmRecords() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [kmRecords, setKmRecords] = useState<KmRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<KmRecord | null>(null)
  const [formData, setFormData] = useState({
    vehicle_id: '',
    km: '',
    date: new Date()
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: keyof KmRecord; direction: 'ascending' | 'descending' } | null>(null)
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [statsData, setStatsData] = useState<StatsData>({
    totalVehicles: 0,
    totalRecords: 0,
    averageKmPerRecord: 0,
    latestUpdate: null
  })
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [vehicleSearchText, setVehicleSearchText] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 7

  useEffect(() => {
    fetchUserSession()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchVehicles()
      fetchKmRecords()
    }
  }, [userId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setFilteredVehicles([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const calculateStats = useCallback(() => {
    let totalKm = 0
    let latestDate: Date | null = null
    
    kmRecords.forEach(record => {
      totalKm += record.km
      const recordDate = new Date(record.date)
      if (!latestDate || recordDate > latestDate) {
        latestDate = recordDate
      }
    })

    setStatsData({
      totalVehicles: vehicles.length,
      totalRecords: kmRecords.length,
      averageKmPerRecord: kmRecords.length > 0 ? Math.round(totalKm / kmRecords.length) : 0,
      latestUpdate: latestDate ? format(latestDate, 'dd.MM.yyyy', { locale: tr }) : null
    })
  }, [kmRecords, vehicles])

  useEffect(() => {
    calculateStats()
  }, [calculateStats])

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

  const fetchVehicles = async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
    if (error) {
      console.error('Error fetching vehicles:', error)
      toast({
        title: "Hata",
        description: "Araçlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    } else {
      setVehicles(data || [])
    }
  }

const fetchKmRecords = async () => {
  if (!userId) return
  
  console.log('Fetching records for user:', userId)
  
  try {
    const { data, error } = await supabase
      .from('km_records')
      .select(`
        *,
        vehicle:vehicles (
          id,
          plate,
          make,
          model
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
      throw error
    }

    console.log('Fetched records:', data)
    setKmRecords(data || [])
    
  } catch (error: any) {
    console.error('Error fetching km records:', error)
    toast({
      title: "Hata",
      description: "Km kayıtları yüklenirken bir hata oluştu.",
      variant: "destructive",
    })
  }
}

  const handleSort = (key: keyof KmRecord) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const filteredAndSortedRecords = React.useMemo(() => {
    let result = kmRecords.filter(record => 
      (record.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
       record.vehicle?.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
       record.vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterVehicle === 'all' || record.vehicle_id.toString() === filterVehicle)
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
  }, [kmRecords, searchTerm, filterVehicle, sortConfig])

  const totalPages = Math.ceil(filteredAndSortedRecords.length / ITEMS_PER_PAGE)
  const paginatedRecords = filteredAndSortedRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleAdd = () => {
    setSelectedRecord(null)
    setFormData({
      vehicle_id: '',
      km: '',
      date: new Date()
    })
    setVehicleSearchText('')
    setIsDialogOpen(true)
  }

  const handleEdit = (record: KmRecord) => {
    setSelectedRecord(record)
    const vehicle = vehicles.find(v => v.id === record.vehicle_id)
    setFormData({
      vehicle_id: record.vehicle_id.toString(), 
      km: record.km.toString(),
      date: new Date(record.date)
    })
    setVehicleSearchText(vehicle?.plate || '')
    setIsDialogOpen(true)
  }

  const handleDelete = (record: KmRecord) => {
    setSelectedRecord(record)
    setIsAlertDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }))
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

  if (!formData.vehicle_id || !formData.km) {
    toast({
      title: "Hata",
      description: "Lütfen tüm alanları doldurun.",
      variant: "destructive",
    })
    return
  }

  try {
    if (selectedRecord) {
      // Update işlemi
      const { data, error } = await supabase
        .from('km_records')
        .update({
          km: parseInt(formData.km),
          date: formData.date.toISOString(),
        })
        .eq('id', selectedRecord.id)
        .eq('user_id', userId)

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      console.log('Update response:', data)
    } else {
      // Insert işlemi için gönderilen veriyi kontrol edelim
      const newRecord = {
        vehicle_id: parseInt(formData.vehicle_id),
        km: parseInt(formData.km),
        date: formData.date.toISOString(),
        user_id: userId
      }
      
      console.log('Inserting record:', newRecord)

      const { data, error } = await supabase
        .from('km_records')
        .insert([newRecord])
        .select() // Insert sonrası veriyi geri almak için

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      console.log('Insert response:', data)
    }

    // İşlem başarılı olduktan sonra
    await fetchKmRecords() // Listeyi yenile

    // Form ve state'leri sıfırla
    setIsDialogOpen(false)
    setSelectedRecord(null)
    setVehicleSearchText('')
    setFormData({
      vehicle_id: '',
      km: '',
      date: new Date()
    })

    toast({
      title: "Başarılı",
      description: selectedRecord ? "Km kaydı başarıyla güncellendi." : "Km kaydı başarıyla kaydedildi.",
    })

  } catch (error: any) {
    console.error('Detailed error:', error)
    toast({
      title: "Hata",
      description: error.message || "Km kaydı kaydedilirken bir hata oluştu.",
      variant: "destructive",
    })
  }
}

const confirmDelete = async () => {
  if (!selectedRecord || !userId) return

  try {
    // Önce silinecek kaydın var olduğunu kontrol edelim
    const { data: checkData, error: checkError } = await supabase
      .from('km_records')
      .select('id')
      .eq('id', selectedRecord.id)
      .single()

    if (checkError || !checkData) {
      console.error('Record check error:', checkError)
      throw new Error('Kayıt bulunamadı')
    }

    // Silme işlemi
    const { error: deleteError } = await supabase
      .from('km_records')
      .delete()
      .eq('id', selectedRecord.id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }

    // Silme işlemi başarılı olduktan sonra
    console.log('Record successfully deleted')

    // Liste güncellemesini bekleyelim
    await fetchKmRecords()

    setIsAlertDialogOpen(false)
    setSelectedRecord(null)

    toast({
      title: "Başarılı",
      description: "Km kaydı başarıyla silindi.",
    })

  } catch (error: any) {
    console.error('Detailed delete error:', error)
    toast({
      title: "Hata",
      description: error.message || "Km kaydı silinirken bir hata oluştu.",
      variant: "destructive",
    })
  }
}

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Km Kayıtları</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kayıt Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Araç</CardTitle>
            <Car className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.totalVehicles}</div>
            <p className="text-xs text-blue-500">Sistemde kayıtlı araç sayısı</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kayıt</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.totalRecords}</div>
            <p className="text-xs text-green-500">Toplam km kaydı sayısı</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Km</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.averageKmPerRecord}</div>
            <p className="text-xs text-yellow-500">Kayıt başına ortalama km</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Son Kayıt</CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.latestUpdate || 'N/A'}</div>
            <p className="text-xs text-orange-500">En son km kaydı tarihi</p>
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
      </div>

      <Card>
        <CardContent>
          {paginatedRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('vehicle_id')}>
                      Araç Plakası {sortConfig?.key === 'vehicle_id' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>Marka/Model</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('km')}>
                      Kilometre {sortConfig?.key === 'km' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                      Kayıt Tarihi {sortConfig?.key === 'date' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.vehicle?.plate}</TableCell>
                      <TableCell>{record.vehicle?.make} {record.vehicle?.model}</TableCell>
                      <TableCell>{record.km.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(record.date), "d MMMM yyyy", { locale: tr })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record)}>
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
              <p className="text-gray-500">Henüz km kaydı bulunmamaktadır.</p>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {selectedRecord ? 'Km Kaydı Güncelle' : 'Yeni Km Kaydı Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vehicle_id" className="text-sm font-medium text-gray-700 flex items-center">
                <CarIcon className="w-4 h-4 mr-2" />
                Araç
              </Label>
              <div ref={searchRef} className="relative w-full">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="vehicleSearch"
                  name="vehicleSearch"
                  value={vehicleSearchText}
                  onChange={(e) => {
                    const searchTerm = e.target.value
                    setVehicleSearchText(searchTerm)
                    const filtered = vehicles.filter(vehicle => 
                      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    setFilteredVehicles(filtered)
                    if (searchTerm === '') {
                      setFormData(prev => ({ ...prev, vehicle_id: '' }))
                    }
                  }}
                  className="pl-8"
                  placeholder="Araç plakası ara"
                  disabled={!!selectedRecord}
                />
                {filteredVehicles.length > 0 && !selectedRecord && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                    {filteredVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, vehicle_id: vehicle.id.toString() }))
                          setVehicleSearchText(vehicle.plate)
                          setFilteredVehicles([])
                        }}
                      >
                        {vehicle.plate}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="km" className="text-sm font-medium text-gray-700 flex items-center">
                <ClockIcon className="w-4 h-4 mr-2" />
                Kilometre
              </Label>
              <Input
                id="km"
                name="km"
                type="number"
                placeholder="Kilometre değerini girin"
                value={formData.km}
                onChange={handleInputChange}
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" /> Tarih
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date.toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                {selectedRecord ? 'Güncelle' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem km kaydını silecektir. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsAlertDialogOpen(false)
              setSelectedRecord(null)
            }}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

