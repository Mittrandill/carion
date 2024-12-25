'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, differenceInDays, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LabelList } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { Task, Vehicle, FuelRecord } from '../types'
import { useNavigate } from 'react-router-dom'
import TaskForm from '@/components/TaskForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { FaGasPump, FaCar, FaCoins, FaChartSimple } from "react-icons/fa6"

export default function UserDashboard() {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [tasks, setTasks] = useState<Task[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])

  const fetchData = useCallback(async (userId: string) => {
    try {
      setIsLoading(true)
      const [tasksData, vehiclesData, fuelRecordsData] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('vehicles').select('*').eq('user_id', userId),
        supabase.from('fuel_records').select('*').eq('user_id', userId)
      ])

      if (tasksData.error) throw tasksData.error
      if (vehiclesData.error) throw vehiclesData.error
      if (fuelRecordsData.error) throw fuelRecordsData.error

      setTasks(tasksData.data || [])
      setVehicles(vehiclesData.data || [])
      setFuelRecords(fuelRecordsData.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        fetchData(session.user.id)
      } else {
        setIsLoading(false)
      }
    }

    fetchSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchData(session.user.id)
      } else {
        setTasks([])
        setVehicles([])
        setFuelRecords([])
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setTasks([])
    setVehicles([])
    setFuelRecords([])
    toast({
      title: "Çıkış yapıldı",
      description: "Başarıyla çıkış yaptınız.",
    })
  }

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  const getDaysInView = useMemo(() => {
    switch (view) {
      case 'month':
        return eachDayOfInterval({
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        })
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        })
      case 'day':
        return [currentDate]
      case 'agenda':
        return eachDayOfInterval({
          start: currentDate,
          end: addDays(currentDate, 14)
        })
    }
  }, [currentDate, view])

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date)
    setIsTaskFormOpen(true)
  }, [])

  const getTasksForDate = useCallback((date: Date) => {
    return tasks.filter(task => 
      isSameDay(parseISO(task.date), date) && !task.completed
    )
  }, [tasks])

  const taskTags = useMemo(() => [
    { id: 'servis', name: 'Servis/Bakım', color: 'bg-blue-200' },
    { id: 'egzoz', name: 'Egzoz Emisyon Ölçümü', color: 'bg-green-200' },
    { id: 'vize', name: 'Vize/Muayene', color: 'bg-yellow-200' },
    { id: 'sigorta', name: 'Sigorta Yenileme', color: 'bg-purple-200' },
    { id: 'lastik', name: 'Lastik Değişimi', color: 'bg-red-200' },
  ], [])

  const totalFuelConsumption = useMemo(() => fuelRecords.reduce((sum, record) => sum + record.amount, 0), [fuelRecords])
  const totalFuelCost = useMemo(() => fuelRecords.reduce((sum, record) => sum + record.total, 0), [fuelRecords])
  const averageFuelCost = useMemo(() => vehicles.length > 0 ? totalFuelCost / vehicles.length : 0, [vehicles.length, totalFuelCost])

  const renderTaskLabel = useCallback((task: Task, vehicle: Vehicle | undefined) => {
    const daysLeft = differenceInDays(parseISO(task.date), new Date())
    const tagName = taskTags.find(tag => tag.id === task.tag)?.name || ''
    return `${vehicle?.plate || 'Unknown Vehicle'} ${tagName} ${daysLeft} Gün Kaldı`
  }, [taskTags])

  const renderCalendarContent = useCallback(() => {
    switch (view) {
      case 'month':
      case 'week':
        return (
          <div className={`grid ${view === 'month' ? 'grid-cols-7' : 'grid-cols-7'} gap-1`}>
            {weekDays.map(day => (
              <div key={day} className="text-center font-medium text-sm py-2 text-gray-500">{day}</div>
            ))}
            {getDaysInView.map((day, index) => {
              const tasksForDay = getTasksForDate(day)
              return (
                <div
                  key={index}
                  className={`relative ${view === 'month' ? 'h-24' : 'h-32'} p-1 border rounded-lg ${
                    isSameMonth(day, currentDate) ? 'bg-white' : 'bg-gray-50'
                  } ${isSameDay(day, new Date()) ? 'border-blue-500' : 'border-gray-200'} hover:bg-gray-100 transition-colors duration-200`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`font-medium text-sm ${isSameDay(day, new Date()) ? 'text-blue-500' : ''}`}>{format(day, 'd')}</div>
                  <div className="absolute bottom-1 left-1 right-1">
                    {tasksForDay.slice(0, 2).map((task, taskIndex) => {
                      const vehicle = vehicles.find(v => v.id === task.vehicleid)
                      const tagColor = taskTags.find(tag => tag.id === task.tag)?.color
                      return (
                        <div 
                          key={taskIndex} 
                          className={`text-xs p-1 mb-1 rounded ${tagColor} text-gray-800 truncate`}
                        >
                          {renderTaskLabel(task, vehicle)}
                        </div>
                      )
                    })}
                    {tasksForDay.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{tasksForDay.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      case 'day':
        return (
          <div className="space-y-2">
            {getTasksForDate(currentDate).map((task, index) => {
              const vehicle = vehicles.find(v => v.id === task.vehicleid)
              const tagColor = taskTags.find(tag => tag.id === task.tag)?.color
              return (
                <div key={index} className={`p-2 rounded ${tagColor}`}>
                  <div className="font-medium">{renderTaskLabel(task, vehicle)}</div>
                  <div className="text-sm">{task.description}</div>
                </div>
              )
            })}
          </div>
        )
      case 'agenda':
        return (
          <div className="space-y-4">
            {getDaysInView.map((day, index) => {
              const tasksForDay = getTasksForDate(day)
              if (tasksForDay.length === 0) return null
              return (
                <div key={index}>
                  <div className="font-medium mb-2">{format(day, 'EEEE, d MMMM', { locale: tr })}</div>
                  {tasksForDay.map((task, taskIndex) => {
                    const vehicle = vehicles.find(v => v.id === task.vehicleid)
                    const tagColor = taskTags.find(tag => tag.id === task.tag)?.color
                    return (
                      <div key={taskIndex} className={`p-2 rounded ${tagColor} mb-2`}>
                        <div className="font-medium">{renderTaskLabel(task, vehicle)}</div>
                        <div className="text-sm">{task.description}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
    }
  }, [view, getDaysInView, weekDays, currentDate, getTasksForDate, handleDateClick, taskTags, vehicles, renderTaskLabel])

  const metricCards = [
    { title: "Kayıtlı Araç", value: vehicles.length + " Adet", icon: FaCar, color: "text-amber-300", update: "Son Güncelleme: Şimdi" },
    { title: "Toplam Yakıt Tüketimi", value: totalFuelConsumption.toFixed(2) + " Lt", icon: FaGasPump, color: "text-lime-300", update: "Son Güncelleme: Şimdi" },
    { title: "Toplam Yakıt Gideri", value: totalFuelCost.toFixed(2) + " ₺", icon: FaCoins, color: "text-red-300", update: "Son Güncelleme: Şimdi" },
    { title: "Ortalama Yakıt Gideri", value: averageFuelCost.toFixed(2) + " ₺", icon: FaChartSimple , color: "text-blue-300", update: "Son Güncelleme: Şimdi" },
  ]

  const taskDistributionData = useMemo(() => {
    const data: { [key: string]: number } = {}
    taskTags.forEach(tag => {
      data[tag.name] = tasks.filter(task => task.tag === tag.id && !task.completed).length
    })
    return Object.entries(data).map(([name, value]) => ({ name, value }))
  }, [tasks, taskTags])

  const fuelConsumptionData = useMemo(() => {
    const data: { [key: string]: { consumption: number, cost: number } } = {}
    fuelRecords.forEach(record => {
      const month = format(parseISO(record.date), 'MMM')
      if (!data[month]) {
        data[month] = { consumption: 0, cost: 0 }
      }
      data[month].consumption += record.amount
      data[month].cost += record.total
    })
    return Object.entries(data).map(([name, values]) => ({
      name,
      ...values
    }))
  }, [fuelRecords])

  const vehicleTypesData = useMemo(() => {
    const types: { [key: string]: number } = {}
    vehicles.forEach(vehicle => {
      types[vehicle.type] = (types[vehicle.type] || 0) + 1
    })
    return Object.entries(types).map(([name, Adet]) => ({ name, Adet }))
  }, [vehicles])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658']

  const handleSaveTask = async (newTask: any) => {
    if (!session) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Görev eklemek için giriş yapmalısınız.",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...newTask, user_id: session.user.id }])
        .select()

      if (error) throw error

      toast({
        title: "Görev eklendi",
        description: "Yeni görev başarıyla eklendi.",
      })

      setTasks(prevTasks => [...prevTasks, data[0]])
      setIsTaskFormOpen(false)
      await fetchData(session.user.id)
    } catch (error) {
      console.error('Error saving task:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Görev eklenirken bir hata oluştu.",
      })
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl mb-4">Lütfen giriş yapın</h1>
        <Button onClick={() => navigate('/login')}>
          Giriş Yap
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {metricCards.map((card, index) => (
            <Card key={index} className="bg-white shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <card.icon className={`h-6 w-6 md:h-8 md:w-8 ${card.color}`} />
                  <div className="text-right">
                    <p className="text-xs md:text-sm font-medium text-gray-400">{card.title}</p>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900">{card.value}</h3>
                  </div>
                </div>
                <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm text-gray-400">
                  <Clock className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  {card.update}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl font-semibold flex items-center">
                  <Calendar className="mr-2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                  Takvim
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(date => addMonths(date, -1))}>
                    <ChevronLeft  className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(date => addMonths(date, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h2 className="text-base md:text-lg font-semibold mt-2">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </h2>
              <Tabs value={view} onValueChange={(value) => setView(value as typeof view)} className="mt-2">
                <TabsList className="grid grid-cols-4 md:flex">
                  <TabsTrigger value="month">Ay</TabsTrigger>
                  <TabsTrigger value="week">Hafta</TabsTrigger>
                  <TabsTrigger value="day">Gün</TabsTrigger>
                  <TabsTrigger value="agenda">Ajanda</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {renderCalendarContent()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl font-semibold">Yaklaşan Görevler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
              {tasks
    .filter(task => !task.completed && new Date(task.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
    .map(task => {
                    const daysLeft = differenceInDays(new Date(task.date), new Date())
                    const tagColor = taskTags.find(tag => tag.id === task.tag)?.color
                    const vehicle = vehicles.find(v => v.id === task.vehicleid)
                    return (
                      <div key={task.id} className="flex items-center p-3 bg-white rounded-lg shadow">
                        <div className={`w-3 h-3 rounded-full mr-3 ${tagColor}`}></div>
                        <div>
                          <div className="font-medium">
                            {daysLeft} GÜN KALDI
                          </div>
                          <div className="text-sm text-gray-600">
                            {renderTaskLabel(task, vehicle)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(parseISO(task.date), 'dd.MM.yyyy')} - {task.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <Button className="w-full mt-4" variant="default" onClick={() => navigate('/tasks')}>
                TÜM GÖREVLER
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-semibold">Yakıt Tüketim Maliyeti</CardTitle>
            <p className="text-xs md:text-sm text-gray-500">Aylık yakıt tüketimi ve maliyeti</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fuelConsumptionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="consumption" name="Yakıt Tüketimi (Lt)" stroke="#8884d8" fill="#8884d8" yAxisId="left" />
                  <Area type="monotone" dataKey="cost" name="Yakıt Maliyeti (₺)" stroke="#82ca9d" fill="#82ca9d" yAxisId="right" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center text-xs md:text-sm text-gray-400">
              <Clock className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              Son güncelleme: {format(new Date(), 'dd.MM.yyyy HH:mm')}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl font-semibold">Görev Dağılımı</CardTitle>
              <p className="text-xs md:text-sm text-gray-500">Görev türlerine göre dağılım</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs md:text-sm text-gray-600">
                Bu grafik, farklı görev türlerinin dağılımını göstermektedir. En çok görülen görev türleri kolayca tespit edilebilir.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl font-semibold">Araç Türleri</CardTitle>
              <p className="text-xs md:text-sm text-gray-500">Filodaki araç türlerinin dağılımı</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleTypesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Adet" fill="#8884d8">
                      {vehicleTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs md:text-sm text-gray-600 flex flex-wrap gap-2">
                {vehicleTypesData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-3 h-3 mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs md:text-sm text-gray-600">
                Bu grafik, farklı Araç türlerinin dağılımını göstermektedir. En çok görülen araç türleri kolayca tespit edilebilir.
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Görev Ekle</DialogTitle>
            </DialogHeader>
            <TaskForm
              onSave={handleSaveTask}
              onCancel={() => setIsTaskFormOpen(false)}
              initialDate={selectedDate}
              vehicles={vehicles}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}