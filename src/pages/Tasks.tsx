'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, parseISO, differenceInDays, isValid, isAfter, isBefore, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Plus, Search, CheckCircle, Trash2, ChevronLeft, ChevronRight, Car, Calendar, CheckSquare, Clock, CalendarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TaskForm from '@/components/TaskForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

const taskTags = [
  { id: 'servis', name: 'Servis/Bakım', color: 'bg-blue-500' },
  { id: 'egzoz', name: 'Egzoz Emisyon Ölçümü', color: 'bg-green-500' },
  { id: 'vize', name: 'Vize/Muayene', color: 'bg-yellow-500' },
  { id: 'sigorta', name: 'Sigorta Yenileme', color: 'bg-purple-500' },
  { id: 'lastik', name: 'Lastik Değişimi', color: 'bg-red-500' },
]

interface Task {
  id: string
  title: string
  description: string
  date: string
  tag: string
  completed: boolean
  vehicleid: number
  createdby: string
  createdat: string
  updatedat: string
  user_id: string
}

interface Vehicle {
  id: number
  plate: string
  visaValidUntil: string
  user_id: string
}

const ITEMS_PER_PAGE = 7;

export default function Tasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [currentPageOngoing, setCurrentPageOngoing] = useState(1)
  const [currentPageCompleted, setCurrentPageCompleted] = useState(1)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  const clearFilters = () => {
    setSearchTerm('');
    setFilterVehicle('all');
    setDateRange({ from: undefined, to: undefined });
    setCurrentPageOngoing(1);
    setCurrentPageCompleted(1);
  };

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

  useEffect(() => {
    fetchUserSession()
  }, [])

  const fetchData = useCallback(async () => {
    if (!userId) return

    try {
      const [tasksData, vehiclesData] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('vehicles').select('*').eq('user_id', userId)
      ])

      if (tasksData.error) throw tasksData.error
      if (vehiclesData.error) throw vehiclesData.error

      setTasks(tasksData.data || [])
      setVehicles(vehiclesData.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu.",
      })
    }
  }, [toast, userId])

  useEffect(() => {
    if (userId) {
      fetchData()

      const tasksSubscription = supabase
        .channel('tasks_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, fetchData)
        .subscribe()

      return () => {
        tasksSubscription.unsubscribe()
      }
    }
  }, [fetchData, userId])

  const handleSaveTask = async (newTask: Omit<Task, 'id' | 'createdat' | 'updatedat' | 'user_id'>) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...newTask, user_id: userId }])
        .select()

      if (error) throw error

      toast({
        title: "Görev eklendi",
        description: "Yeni görev başarıyla eklendi.",
      })
      
      await fetchData() // Refresh all data
    } catch (error) {
      console.error('Error saving task:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Görev eklenirken bir hata oluştu.",
      })
    }
    setIsTaskFormOpen(false)
  }

  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (taskToDelete && userId) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskToDelete)
          .eq('user_id', userId)
        if (error) throw error
        toast({
          title: "Görev silindi",
          description: "Görev başarıyla silindi.",
        })
        fetchData()
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Görev silinirken bir hata oluştu.",
        })
      }
    }
    setDeleteDialogOpen(false)
    setTaskToDelete(null)
  }

  const handleTaskComplete = async (task: Task) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: true })
        .eq('id', task.id)
        .eq('user_id', userId)
      
      if (error) throw error

      toast({
        title: "Görev tamamlandı",
        description: "Görev başarıyla tamamlandı.",
      })
      fetchData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Görev tamamlanırken bir hata oluştu.",
      })
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicles.find(v => v.id === task.vehicleid)?.plate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVehicle = filterVehicle === 'all' || task.vehicleid.toString() === filterVehicle;
    const taskDate = startOfDay(parseISO(task.date));
    const matchesDateRange = (!dateRange.from || isAfter(taskDate, startOfDay(dateRange.from))) &&
      (!dateRange.to || isBefore(taskDate, startOfDay(dateRange.to)));
    return matchesSearch && matchesVehicle && matchesDateRange;
  });

  const ongoingTasks = filteredTasks.filter(task => !task.completed)
  const completedTasks = filteredTasks.filter(task => task.completed)

  const getVehiclePlate = (vehicleId: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? vehicle.plate : 'Bilinmeyen Araç'
  }

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    return isValid(date) ? format(date, 'dd.MM.yyyy') : 'Geçersiz Tarih'
  }

  const calculateDaysLeft = (dateString: string) => {
    const date = parseISO(dateString)
    if (!isValid(date)) return 'Geçersiz Tarih'
    const today = new Date()
    return differenceInDays(date, today)
  }

  const renderTaskTable = (tasks: Task[], currentPage: number, setCurrentPage: React.Dispatch<React.SetStateAction<number>>) => {
    const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Araç</TableHead>
              <TableHead>Görev</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Kalan Gün</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.map((task) => {
              const daysLeft = calculateDaysLeft(task.date);
              return (
                <TableRow key={task.id}>
                  <TableCell>{getVehiclePlate(task.vehicleid)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${taskTags.find(t => t.id === task.tag)?.color} text-white`}>
                      {taskTags.find(t => t.id === task.tag)?.name}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>{formatDate(task.date)}</TableCell>
                  <TableCell>{typeof daysLeft === 'number' ? `${daysLeft} gün` : daysLeft}</TableCell>
                  <TableCell>
                    {!task.completed && (
                      <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleTaskComplete(task)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
            Toplam {tasks.length} kayıttan {startIndex + 1}-{Math.min(endIndex, tasks.length)} arası gösteriliyor
          </div>
        </div>
      </>
    );
  };

  

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Görevlerim</h1>
        <Button onClick={() => setIsTaskFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Görev Ekle
        </Button>
      </div>

      {/* Bilgilendirme Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <Card className="bg-white text-gray">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">En Fazla Görev Alan Araç</CardTitle>
      <Car className="h-4 w-4 text-blue-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {(() => {
          const vehicleTasks = tasks.reduce((acc, task) => {
            acc[task.vehicleid] = (acc[task.vehicleid] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);
          const maxTasks = Math.max(...Object.values(vehicleTasks));
          const maxVehicleId = Object.keys(vehicleTasks).find(
            (id) => vehicleTasks[Number(id)] === maxTasks
          );
          return maxVehicleId
            ? `${getVehiclePlate(Number(maxVehicleId))} (${maxTasks})`
            : 'N/A';
        })()}
      </div>
      <p className="text-xs text-blue-500">En fazla görev alan araç</p>
    </CardContent>
  </Card>
  <Card className="bg-white text-gray">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Bu Ay Görevler</CardTitle>
      <Calendar className="h-4 w-4 text-green-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{tasks.filter(task => {
        const taskDate = parseISO(task.date);
        const now = new Date();
        return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
      }).length}</div>
      <p className="text-xs text-green-500">Bu ay içindeki toplam görev sayısı</p>
    </CardContent>
  </Card>
  <Card className="bg-white text-gray">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Tamamlanan Görevler</CardTitle>
      <CheckSquare className="h-4 w-4 text-purple-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{completedTasks.length}</div>
      <p className="text-xs text-purple-500">Tamamlanan toplam görev sayısı</p>
    </CardContent>
  </Card>
  <Card className="bg-white text-gray">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Bekleyen Görevler</CardTitle>
      <Clock className="h-4 w-4 text-yellow-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{ongoingTasks.length}</div>
      <p className="text-xs text-yellow-500">Devam eden toplam görev sayısı</p>
    </CardContent>
  </Card>
</div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4 text-gray-500" />}
          />
        </div>
        <Select onValueChange={setFilterVehicle} value={filterVehicle}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.plate}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={`w-[280px] justify-start text-left font-normal ${
                !dateRange.from && !dateRange.to ? "text-muted-foreground" : ""
              }`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "d MMMM yyyy", { locale: tr })} -{" "}
                    {format(dateRange.to, "d MMMM yyyy", { locale: tr })}
                  </>
                ) : (
                  format(dateRange.from, "d MMMM yyyy", { locale: tr })
                )
              ) : (
                <span>Tarih Aralığı Seçin</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={tr}
              formatters={{
                formatWeekday: (day) => tr.localize?.day(day, { width: 'short' }) ?? '',
                formatCaption: (date, options) => {
                  const month = tr.localize?.month(date.getMonth(), { width: 'long' }) ?? '';
                  return `${month} ${date.getFullYear()}`;
                },
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          onClick={clearFilters}
          className="whitespace-nowrap"
        >
          Filtreleri Temizle
        </Button>
      </div>

      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ongoing">Devam Eden</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan</TabsTrigger>
        </TabsList>
        <TabsContent value="ongoing">
          <Card>
            <CardContent className="pt-6">
              {renderTaskTable(ongoingTasks, currentPageOngoing, setCurrentPageOngoing)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="completed">
          <Card>
            <CardContent className="pt-6">
              {renderTaskTable(completedTasks, currentPageCompleted, setCurrentPageCompleted)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Görev Ekle</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSave={handleSaveTask}
            onCancel={() => setIsTaskFormOpen(false)}
            initialDate={null}
            vehicles={vehicles}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem görevi kalıcı olarak silecektir. Bu işlem geri alınamaz.
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

