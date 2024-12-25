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
import { Label } from '@/components/ui/label'
import { format, differenceInDays, isValid, parseISO } from 'date-fns'
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, ArrowUpDown, FileCheck, AlertTriangle, Calendar, Car, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface Vehicle {
  id: string
  plate: string
  make: string
  model: string
  type: string
  visaValidUntil: string
  egzozMuayeneTarihi: string
  user_id: string
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function VisaInspection() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    visaValidUntil: '',
    egzozMuayeneTarihi: '',
    vehicle_id: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; direction: 'ascending' | 'descending' } | null>(null)
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  })
  const [statsData, setStatsData] = useState({
    totalVehicles: 0,
    expiredVisas: 0,
    upcomingVisas: 0,
    nextVisaDate: null as string | null
  })
  const [vehicleSearchText, setVehicleSearchText] = useState('')
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)

  const ITEMS_PER_PAGE = 7

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

  const fetchVehicles = useCallback(async () => {
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
  }, [userId, toast])

  const calculateStats = useCallback(() => {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    let nextDate: Date | null = null
    let expired = 0
    let upcoming = 0

    vehicles.forEach(vehicle => {
      const visaDate = parseISO(vehicle.visaValidUntil)
      
      // Skip invalid dates
      if (!isValid(visaDate)) return
      
      if (visaDate < now) {
        expired++
      } else if (visaDate <= thirtyDaysFromNow) {
        upcoming++
      }
      
      // Only consider future dates for next visa date
      if (visaDate > now && (!nextDate || visaDate < nextDate)) {
        nextDate = visaDate
      }
    })

    setStatsData({
      totalVehicles: vehicles.length,
      expiredVisas: expired,
      upcomingVisas: upcoming,
      nextVisaDate: nextDate ? format(nextDate, 'dd.MM.yyyy') : 'Vize tarihi bulunamadı'
    })
  }, [vehicles])

  useEffect(() => {
    if (userId) {
      fetchVehicles()
    }
  }, [userId, fetchVehicles])

  useEffect(() => {
    calculateStats()
  }, [calculateStats])

  const formatDate = useMemo(() => (dateString: string) => {
    const date = parseISO(dateString)
    return isValid(date) ? format(date, 'dd.MM.yyyy') : 'Geçersiz Tarih'
  }, [])

  const calculateDaysLeft = useMemo(() => (dateString: string) => {
    const date = parseISO(dateString)
    if (!isValid(date)) return 'Geçersiz Tarih'
    const daysLeft = differenceInDays(date, new Date())
    return daysLeft < 0 ? 'Süresi Geçmiş' : `${daysLeft} gün`
  }, [])

  const handleSort = (key: keyof Vehicle) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const filteredAndSortedVehicles = useMemo(() => {
    let result = vehicles.filter(vehicle => 
      (vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
       vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
       vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === 'all' || vehicle.type === filterType) &&
      (!dateRange?.from || !dateRange?.to || 
       (new Date(vehicle.visaValidUntil) >= dateRange.from && 
        new Date(vehicle.visaValidUntil) <= dateRange.to))
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
  }, [vehicles, searchTerm, filterType, dateRange, sortConfig])

  const totalPages = Math.ceil(filteredAndSortedVehicles.length / ITEMS_PER_PAGE)
  const paginatedVehicles = filteredAndSortedVehicles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleAdd = () => {
    setSelectedVehicle(null)
    setFormData({
      visaValidUntil: '',
      egzozMuayeneTarihi: '',
      vehicle_id: ''
    })
    setFilterType('')
    setIsDialogOpen(true)
  }

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setFormData({
      visaValidUntil: vehicle.visaValidUntil.split('T')[0],
      egzozMuayeneTarihi: vehicle.egzozMuayeneTarihi?.split('T')[0] || '',
      vehicle_id: vehicle.id
    })
    setVehicleSearchText(vehicle.plate) 
    setIsDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleVehicleSelect = (vehicleid: string) => {
    const selectedVehicle = vehicles.find(v => v.id === vehicleid);
    if (selectedVehicle) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleid,
        visaValidUntil: selectedVehicle.visaValidUntil?.split('T')[0] || '',
        egzozMuayeneTarihi: selectedVehicle.egzozMuayeneTarihi?.split('T')[0] || ''
      }));
    }
  };

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
    const vehicleToUpdate = vehicles.find(v => v.id === formData.vehicle_id)
    if (vehicleToUpdate) {
      try {
        const updatedVehicle = {
          visaValidUntil: formData.visaValidUntil,
          egzozMuayeneTarihi: formData.egzozMuayeneTarihi,
          user_id: userId
        }
        const { error } = await supabase
          .from('vehicles')
          .update(updatedVehicle)
          .eq('id', vehicleToUpdate.id)
          .eq('user_id', userId)
        if (error) throw error

        const { error: updateError } = await supabase
          .from('tasks')
          .update({ completed: true })
          .eq('vehicleid', vehicleToUpdate.id)
          .eq('user_id', userId)
          .eq('completed', false)
          .in('tag', ['vize', 'egzoz'])
        if (updateError) throw updateError

        const newTasks = [
          {
            title: 'Vize Yenileme',
            description: `${vehicleToUpdate.plate} plakalı araç için vize yenileme`,
            date: formData.visaValidUntil,
            tag: 'vize',
            vehicleid: vehicleToUpdate.id,
            completed: false,
            user_id: userId
          },
          {
            title: 'Egzoz Emisyon Ölçümü',
            description: `${vehicleToUpdate.plate} plakalı araç için egzoz emisyon ölçümü`,
            date: formData.egzozMuayeneTarihi,
            tag: 'egzoz',
            vehicleid: vehicleToUpdate.id,
            completed: false,
            user_id: userId
          }
        ]

        const { error: insertError } = await supabase.from('tasks').insert(newTasks)
        if (insertError) throw insertError

        toast({
          title: "Başarılı",
          description: "Vize/Muayene bilgileri başarıyla güncellendi.",
        })
        setIsDialogOpen(false)
        fetchVehicles()
      } catch (error) {
        console.error('Error updating vehicle:', error)
        let errorMessage = "Vize/Muayene bilgileri güncellenirken bir hata oluştu."
        if (error instanceof Error) {
          errorMessage += ` Hata detayı: ${error.message}`
        }
        toast({
          title: "Hata",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Hata",
        description: "Lütfen bir araç seçin.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete || !userId) return

    try {
      // Delete related tires records first
      const { error: tiresError } = await supabase
        .from('tires')
        .delete()
        .eq('vehicle_id', vehicleToDelete.id)
        .eq('user_id', userId)

      if (tiresError) throw tiresError

      // Then delete related tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('vehicleid', vehicleToDelete.id)
        .eq('user_id', userId)

      if (tasksError) throw tasksError

      // Finally delete the vehicle record
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleToDelete.id)
        .eq('user_id', userId)

      if (vehicleError) throw vehicleError

      toast({
        title: "Başarılı",
        description: "Kayıt başarıyla silindi.",
      })
      
      fetchVehicles()
    } catch (error) {
      console.error('Error deleting record:', error)
      toast({
        title: "Hata",
        description: "Kayıt silinirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setVehicleToDelete(null)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setFilteredVehicles([]);
        if (!formData.vehicle_id) {
          setVehicleSearchText('');
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [formData.vehicle_id]);

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Vize/Muayene Kayıtları</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kayıt Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Araç Sayısı</CardTitle>
            <Car className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.totalVehicles}</div>
            <p className="text-xs text-blue-500">Sistemde kayıtlı araç sayısı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Süresi Geçmiş Vizeler</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.expiredVisas}</div>
            <p className="text-xs text-red-500">Yenilenmesi gereken vize sayısı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yaklaşan Vizeler</CardTitle>
            <FileCheck className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.upcomingVisas}</div>
            <p className="text-xs text-yellow-500">30 gün içinde yenilenecek vize sayısı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sıradaki Vize Tarihi</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.nextVisaDate || 'N/A'}</div>
            <p className="text-xs text-green-500">En yakın vize yenileme tarihi</p>
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
        <Select onValueChange={setFilterType} value={filterType}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Araç Tipi Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="OTOMOBİL">Otomobil</SelectItem>
            <SelectItem value="OTOBÜS">Otobüs</SelectItem>
            <SelectItem value="MİNİBÜS">Minibüs</SelectItem>
            <SelectItem value="PANELVAN">Panelvan</SelectItem>
            <SelectItem value="SUV">Suv</SelectItem>
            <SelectItem value="KAMYONET">Kamyonet</SelectItem>
            <SelectItem value="KAMYON">Kamyon</SelectItem>
            <SelectItem value="TRAKTÖR">Traktör</SelectItem>
            <SelectItem value="FORKLİFT">Forklift</SelectItem>
            <SelectItem value="BEKO LOADER">Beko Loader</SelectItem>
            <SelectItem value="EKSKAVATÖR">Ekskavatör</SelectItem>
            <SelectItem value="TELEHANDLER">Telehandler</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClear={() => setDateRange(undefined)}
          />
          <Button 
            variant="outline" 
            onClick={() => setDateRange(undefined)}
            className="h-10"
          >
            Temizle
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {paginatedVehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('plate')}>
                      Araç Plakası {sortConfig?.key === 'plate' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('visaValidUntil')}>
                      Vize Geçerlilik Tarihi {sortConfig?.key === 'visaValidUntil' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>Kalan Gün</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('egzozMuayeneTarihi')}>
                      Egzoz Muayene Tarihi {sortConfig?.key === 'egzozMuayeneTarihi' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>Kalan Gün</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>{vehicle.plate}</TableCell>
                      <TableCell>{formatDate(vehicle.visaValidUntil)}</TableCell>
                      <TableCell>{calculateDaysLeft(vehicle.visaValidUntil)}</TableCell>
                      <TableCell>{formatDate(vehicle.egzozMuayeneTarihi)}</TableCell>
                      <TableCell>{calculateDaysLeft(vehicle.egzozMuayeneTarihi)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEdit(vehicle)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteClick(vehicle)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">Henüz vize/muayene kaydı bulunmamaktadır.</p>
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
            <span className="sr-only">Önceki sayfa</span>
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
            <span className="sr-only">Sonraki sayfa</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Toplam {filteredAndSortedVehicles.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedVehicles.length)} arası gösteriliyor
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVehicle ? 'Vize/Muayene Bilgilerini Düzenle' : 'Yeni Vize/Muayene Kaydı Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vehicle_id" className="text-right">
                  Araç
                </Label>
                <div className="relative col-span-3">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <Input
                    id="vehicleSearch"
                    name="vehicleSearch"
                    value={vehicleSearchText}
                    onChange={(e) => {
                      const searchTerm = e.target.value;
                      setVehicleSearchText(searchTerm);
                      const filtered = vehicles.filter(vehicle => 
                        vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      setFilteredVehicles(filtered);
                      if (searchTerm === '') {
                        setFormData(prev => ({ ...prev, vehicle_id: '' }));
                      }
                    }}
                    className="pl-8 w-full"
                    placeholder="Araç plakası ara"
                    disabled={!!selectedVehicle}
                  />
                  {vehicleSearchText && filteredVehicles.length > 0 && (
                    <div 
                      ref={searchResultsRef}
                      className="absolute z-50 w-full max-h-[200px] overflow-y-auto bg-white border rounded-md shadow-lg mt-1"
                    >
                      {filteredVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                          onClick={() => {
                            handleVehicleSelect(vehicle.id);
                            setVehicleSearchText(vehicle.plate);
                            setFilteredVehicles([]);
                          }}
                        >
                          {vehicle.plate}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="visaValidUntil" className="text-right">
                  Vize Geçerlilik Tarihi
                </Label>
                <Input
                  id="visaValidUntil"
                  name="visaValidUntil"
                  type="date"
                  value={formData.visaValidUntil}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="egzozMuayeneTarihi" className="text-right">
                  Egzoz Muayene Tarihi
                </Label>
                <Input
                  id="egzozMuayeneTarihi"
                  name="egzozMuayeneTarihi"
                  type="date"
                  value={formData.egzozMuayeneTarihi}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{selectedVehicle ? 'Güncelle' : 'Ekle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setVehicleToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Kaydı Sil"
        description={`${vehicleToDelete?.plate || ''} plakalı araca ait vize/muayene kaydını silmek istediğinizden emin misiniz?`}
      />
    </div>
  )
}

