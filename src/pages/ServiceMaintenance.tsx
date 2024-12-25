'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Label } from '@/components/ui/label'
import { Plus, Search, ArrowUpDown, Edit, Trash2, Wrench, DollarSign, Calendar, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, isValid, parseISO, isWithinInterval } from 'date-fns'
import { Textarea } from '@/components/ui/textarea'
import { DateRangePicker } from "@/components/ui/date-range-picker"

interface Vehicle {
  id: string
  plate: string
  currentKm: number
}

interface Task {
  id: string;
  vehicleid: number;
  date: string;
  description: string | null;
  cost: number;
  currentKm: number | null;
  nextServiceDate: string | null;
  nextServiceKm: number | null;
  title: string | null;
  servicetype: string | null;
  tag: string | null;
  user_id: string;
  vehicles?: {
    id: number;
    plate: string;
  };
}

export default function ServiceMaintenance() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    date: '',
    description: '',
    cost: '',
    currentKm: '',
    nextServiceDate: '',
    nextServiceKm: '',
    title: '',
    servicetype: '',
    tag: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: keyof Task; direction: 'ascending' | 'descending' } | null>(null)
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  const [totalServiceCount, setTotalServiceCount] = useState(0)
  const [totalServiceCost, setTotalServiceCost] = useState(0)
  const [nextServiceDate, setNextServiceDate] = useState<string | null>(null)
  const [mostServicedVehicle, setMostServicedVehicle] = useState<{ plate: string, count: number } | null>(null)

  const ITEMS_PER_PAGE = 7
  const KM_THRESHOLD = 1000 // Bildirim için km eşiği

  useEffect(() => {
    fetchUserIdAndData()
  }, [])

  const fetchUserIdAndData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      fetchVehicles(user.id)
      fetchTasks(user.id)
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      navigate('/login')
    }
  }

  const fetchVehicles = async (userId: string) => {
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

  const fetchTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_records')
        .select(`
          *,
          vehicles (
            id,
            plate
          )
        `)
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error fetching service records:', error)
        toast({
          title: "Hata",
          description: "Servis kayıtları yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
        return
      }
      
      console.log('Fetched service records:', data)
      setTasks(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Hata",
        description: "Servis kayıtları yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const calculateCardData = useCallback(() => {
    let serviceCount = 0
    let totalCost = 0
    let earliestNextService: Date | null = null
    const serviceCountByVehicle: { [key: string]: number } = {}

    tasks.forEach(task => {
      serviceCount++
      totalCost += task.cost || 0

      if (task.nextServiceDate) {
        const nextServiceDate = new Date(task.nextServiceDate)
        if (!earliestNextService || nextServiceDate < earliestNextService) {
          earliestNextService = nextServiceDate
        }
      }

      if (!serviceCountByVehicle[task.vehicleid.toString()]) {
        serviceCountByVehicle[task.vehicleid.toString()] = 0
      }
      serviceCountByVehicle[task.vehicleid.toString()]++
    })

    setTotalServiceCount(serviceCount)
    setTotalServiceCost(totalCost)
    setNextServiceDate(earliestNextService ? format(earliestNextService, 'dd.MM.yyyy') : null)

    const mostServiced = Object.entries(serviceCountByVehicle).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])
    const mostServicedVehicleInfo = vehicles.find(v => v.id === mostServiced[0])
    setMostServicedVehicle(mostServicedVehicleInfo ? { plate: mostServicedVehicleInfo.plate, count: mostServiced[1] } : null)
  }, [tasks, vehicles])

  useEffect(() => {
    calculateCardData()
  }, [tasks, calculateCardData])

  const handleSort = (key: keyof Task) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const filteredAndSortedTasks = React.useMemo(() => {
    let result = tasks.filter(task => 
      (task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       task.vehicles?.plate.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterVehicle === 'all' || task.vehicleid.toString() === filterVehicle) &&
      (!dateRange?.from || !dateRange?.to || (new Date(task.date) >= dateRange.from && new Date(task.date) <= dateRange.to))
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
  }, [tasks, searchTerm, filterVehicle, dateRange, sortConfig])

  const totalPages = Math.ceil(filteredAndSortedTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = filteredAndSortedTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleAdd = () => {
    setSelectedTask(null)
    setFormData({
      date: '',
      description: '',
      cost: '',
      currentKm: '',
      nextServiceDate: '',
      nextServiceKm: '',
      title: '',
      servicetype: '',
      tag: ''
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      date: task.date,
      description: task.description?.replace('Servis', '').trim() || '', // Remove 'Servis' text
      cost: task.cost.toString(),
      currentKm: task.currentKm?.toString() || '',
      nextServiceDate: task.nextServiceDate || '',
      nextServiceKm: task.nextServiceKm?.toString() || '',
      title: task.title || '',
      servicetype: task.tag || '', // Use tag as servicetype
      tag: task.tag || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (task: Task) => {
    setSelectedTask(task)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedTask && userId) {
      try {
        const { error } = await supabase
          .from('service_records')
          .delete()
          .eq('id', selectedTask.id)
          .eq('user_id', userId)
        if (error) throw error
        toast({
          title: "Başarılı",
          description: "Kayıt başarıyla silindi.",
        })
        fetchTasks(userId)
      } catch (error) {
        toast({
          title: "Hata",
          description: "Kayıt silinirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    }
    setIsDeleteAlertOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const checkAndCreateServiceNotification = async (vehicleid: string, currentKm: number, nextServiceKm: number, serviceTitle: string) => {
    if (!userId) return

    const KM_THRESHOLD = 500 // Bildirim için km eşiği
    const remainingKm = nextServiceKm - currentKm

    if (remainingKm <= KM_THRESHOLD && remainingKm > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleid)
      if (!vehicle) return

      const notificationTask = {
        vehicleid: vehicleid,
        title: `Yaklaşan Servis Bildirimi: ${serviceTitle}`,
        description: `${vehicle.plate} Plakalı Aracın Sonraki "${serviceTitle}" İçin ${remainingKm} km kaldı`,
        date: new Date().toISOString().split('T')[0],
        tag: 'servis_bakim',
        currentKm: currentKm,
        nextServiceKm: nextServiceKm,
        user_id: userId
      }

      try {
        const { error } = await supabase
          .from('tasks')
          .insert([notificationTask])
        if (error) throw error
        console.log(`Bildirim oluşturuldu: ${notificationTask.description}`)
        toast({
          title: "Bilgi",
          description: `${serviceTitle} için yaklaşan bakım bildirimi oluşturuldu.`,
        })
      } catch (error) {
        console.error('Bildirim oluşturma hatası:', error)
        toast({
          title: "Hata",
          description: "Bildirim oluşturulurken bir hata meydana geldi.",
          variant: "destructive",
        })
      }
    } else {
      console.log(`Bildirim oluşturulmadı. Kalan km: ${remainingKm}, Eşik: ${KM_THRESHOLD}`)
    }
  }

  const updateRelatedTasks = async (serviceRecord: Task) => {
    if (!userId) return;

    try {
      // Find related tasks
      const { data: relatedTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('vehicleid', serviceRecord.vehicleid)
        .eq('tag', 'servis_bakim');

      if (fetchError) throw fetchError;

      // Update each related task
      for (const task of relatedTasks || []) {
        const updateData = {
          title: `Yaklaşan Servis Bildirimi: ${serviceRecord.title}`,
          description: `${serviceRecord.vehicles?.plate} Plakalı Aracın Sonraki "${serviceRecord.title}" İçin ${
            serviceRecord.nextServiceKm ? `${serviceRecord.nextServiceKm - (serviceRecord.currentKm || 0)} km` : 
            serviceRecord.nextServiceDate ? `${serviceRecord.nextServiceDate} tarihinde` : ''
          } servis gerekiyor`,
          currentKm: serviceRecord.currentKm,
          nextServiceKm: serviceRecord.nextServiceKm,
          date: serviceRecord.nextServiceDate || task.date
        };

        const { error: updateError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', task.id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
      }

      console.log('İlgili görevler güncellendi');
    } catch (error) {
      console.error('Görev güncelleme hatası:', error);
      toast({
        title: "Hata",
        description: "İlgili görevler güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedTask) {
      toast({
        title: "Hata",
        description: "Düzenleme için gerekli bilgiler eksik.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData = {
        servicetype: formData.servicetype || null,
        title: formData.title || null,
        description: formData.description || null,
        date: formData.date || null,
        currentKm: formData.currentKm ? parseInt(formData.currentKm) : null,
        nextServiceKm: formData.nextServiceKm ? parseInt(formData.nextServiceKm) : null,
        nextServiceDate: formData.nextServiceDate || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        tag: formData.tag || null
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data: updatedRecord, error } = await supabase
        .from('service_records')
        .update(updateData)
        .eq('id', selectedTask.id)
        .eq('user_id', userId)
        .select('*, vehicles(*)').single();

      if (error) throw error;

      // Update related tasks if the record was updated successfully
      if (updatedRecord) {
        await updateRelatedTasks(updatedRecord);

        // Check if we need to create a new notification
        if (updatedRecord.nextServiceKm && updatedRecord.currentKm) {
          await checkAndCreateServiceNotification(
            updatedRecord.vehicleid.toString(),
            updatedRecord.currentKm,
            updatedRecord.nextServiceKm,
            updatedRecord.title || 'Servis'
          );
        }
      }

      toast({
        title: "Başarılı",
        description: "Kayıt ve ilgili görevler başarıyla güncellendi.",
      });

      setIsDialogOpen(false);
      fetchTasks(userId);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Hata",
        description: "Güncelleme sırasında bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    return isValid(date) ? format(date, 'dd.MM.yyyy') : 'Geçersiz Tarih'
  }

  const calculateRemainingService = (task: Task) => {
    const vehicle = vehicles.find(v => v.id === task.vehicleid.toString())
    if (task.nextServiceKm && vehicle?.currentKm) {
      const remaining = task.nextServiceKm - vehicle.currentKm
      if (remaining > 0) {
        return `${remaining} km kaldı`
      } else {
        return 'Bakım zamanı geldi'
      }
    }
    if (task.nextServiceDate) {
      const remainingDays = Math.ceil((new Date(task.nextServiceDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      if (remainingDays > 0) {
        return `${remainingDays} gün kaldı`
      } else {
        return 'Bakım zamanı geldi'
      }
    }
    return ''
  }

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Servis / Bakım Kayıtları</h1>
        <Button onClick={() => navigate('/service/add')}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Servis Kaydı Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Servis Sayısı</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServiceCount}</div>
            <p className="text-xs text-blue-500">Tüm araçlar için toplam servis sayısı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Servis Maliyeti</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServiceCost.toFixed(2)} TL</div>
            <p className="text-xs text-green-500">Tüm servisler için toplam maliyet</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sıradaki Servis Tarihi</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextServiceDate || 'N/A'}</div>
            <p className="text-xs text-yellow-500">En yakın servis tarihi</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Çok Servis Alan Araç</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostServicedVehicle?.plate || 'N/A'}</div>
            <p className="text-xs text-orange-500">{mostServicedVehicle ? `${mostServicedVehicle.count} servis` : 'Veri yok'}</p>
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
              <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.plate}</SelectItem>
            ))}
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
          {paginatedTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('vehicleid')}>
                      Araç Plakası {sortConfig?.key === 'vehicleid' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('tag')}>
                      Servis/Bakım Türü {sortConfig?.key === 'tag' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                      Tarih {sortConfig?.key === 'date' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('currentKm')}>
                      Km {sortConfig?.key === 'currentKm' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('nextServiceKm')}>
                      Sonraki Servis Km {sortConfig?.key === 'nextServiceKm' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>Sonraki Servis</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('cost')}>
                      Tutar (TL) {sortConfig?.key === 'cost' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.vehicles?.plate}</TableCell>
                      <TableCell>{task.tag}</TableCell>
                      <TableCell>{formatDate(task.date)}</TableCell>
                      <TableCell>{task.currentKm}</TableCell>
                      <TableCell>{task.nextServiceKm || '-'}</TableCell>
                      <TableCell>{calculateRemainingService(task)}</TableCell>
                      <TableCell>{task.cost ? `${task.cost.toFixed(2)} TL` : '-'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="mr-2" 
                          onClick={() => handleEdit(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(task)}
                        >
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
              <p className="text-gray-500">Henüz servis/bakım kaydı bulunmamaktadır.</p>
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
            <span className="sr-only">Sonraki sayfa</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Toplam {filteredAndSortedTasks.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTasks.length)} arası gösteriliyor
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vehiclePlate" className="text-right">
                  Araç Plakası
                </Label>
                <div className="col-span-3 px-3 py-2 border border-input rounded-md bg-muted">
                  {selectedTask?.vehicles?.plate}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="servicetype" className="text-right">
                  Servis/Bakım Türü
                </Label>
                <Select 
                  name="servicetype" 
                  value={formData.tag} // Change from formData.servicetype to formData.tag
                  onValueChange={(value) => {
                    handleInputChange({ target: { name: 'servicetype', value } } as any);
                    handleInputChange({ target: { name: 'tag', value } } as any);
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Servis/Bakım türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Periyodik Bakım">Periyodik Bakım</SelectItem>
                    <SelectItem value="Motor Bakım">Motor Bakım</SelectItem>
                    <SelectItem value="Fren Bakım">Fren Bakım</SelectItem>
                    <SelectItem value="Lastik Değişim">Lastik Değişim</SelectItem>
                    <SelectItem value="Yağ Servisi">Yağ Servisi</SelectItem>
                    <SelectItem value="Diğer">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Başlık
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Açıklama
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Tarih
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentKm" className="text-right">
                  Mevcut Km
                </Label>
                <Input
                  id="currentKm"
                  name="currentKm"
                  type="number"
                  value={formData.currentKm}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nextServiceKm" className="text-right">
                  Sonraki Servis Km
                </Label>
                <Input
                  id="nextServiceKm"
                  name="nextServiceKm"
                  type="number"
                  value={formData.nextServiceKm}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nextServiceDate" className="text-right">
                  Sonraki Servis Tarihi
                </Label>
                <Input
                  id="nextServiceDate"
                  name="nextServiceDate"
                  type="date"
                  value={formData.nextServiceDate}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cost" className="text-right">
                  Maliyet (TL)
                </Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleInputChange}
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
              Bu işlem kaydı silecektir. Bu işlem geri alınamaz.
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

