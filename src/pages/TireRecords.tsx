import React, { useEffect, useState, useMemo } from 'react'
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
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ArrowUpDown, FileUp, FileDown, Download, Upload, X, Ruler, RotateCcw, TrendingUp, Truck, ChevronDown, Settings } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TireRecord {
  id: number;
  date: string;
  vehicle_id: number;
  tire_position: string;
  tire_brand: string;
  tire_size: string;
  tire_type: string;
  change_km: number;
  removed_tire: string;
  installed_tire: string;
  removed_tire_km: number;
  installed_tire_km: number;
  user_id: string;
}

interface Vehicle {
  id: number;
  plate: string;
}

export default function TireRecords() {
  const navigate = useNavigate();
  const [tireRecords, setTireRecords] = useState<TireRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TireRecord | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importedRecordsCount, setImportedRecordsCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 7

  useEffect(() => {
    fetchUserSession()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchTireRecords()
      fetchVehicles()
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

  const fetchTireRecords = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('tire_records')
      .select('*')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching tire records:', error)
      toast({
        title: "Error",
        description: "Failed to fetch tire records. Please try again.",
        variant: "destructive",
      })
    } else {
      setTireRecords(data || [])
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

  const filteredAndSortedRecords = useMemo(() => {
    let result = tireRecords.filter((record: TireRecord) => {
      return (record.tire_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicles.find(v => v.id === record.vehicle_id)?.plate.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterVehicle === 'all' || record.vehicle_id?.toString() === filterVehicle)
    })

    if (sortConfig !== null) {
      result.sort((a: TireRecord, b: TireRecord) => {
        if (a[sortConfig.key as keyof TireRecord] < b[sortConfig.key as keyof TireRecord]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key as keyof TireRecord] > b[sortConfig.key as keyof TireRecord]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return result
  }, [tireRecords, searchTerm, filterVehicle, sortConfig, vehicles])

  const totalTireChanges = useMemo(() => {
    return filteredAndSortedRecords.length
  }, [filteredAndSortedRecords])

  const mostChangedTirePosition = useMemo(() => {
    const positionCounts = filteredAndSortedRecords.reduce((acc, record) => {
      acc[record.tire_position] = (acc[record.tire_position] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(positionCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0]
  }, [filteredAndSortedRecords])

  const averageChangeKm = useMemo(() => {
    const totalKm = filteredAndSortedRecords.reduce((sum, record) => sum + record.change_km, 0)
    return totalTireChanges > 0 ? totalKm / totalTireChanges : 0
  }, [filteredAndSortedRecords, totalTireChanges])

  const mostTireChangesVehicle = useMemo(() => {
    if (filteredAndSortedRecords.length === 0) return null;
    const vehicleChanges = filteredAndSortedRecords.reduce((acc, record) => {
      if (record.vehicle_id) {
        acc[record.vehicle_id] = (acc[record.vehicle_id] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

    const mostChangesVehicleId = Object.entries(vehicleChanges).reduce((a, b) => a[1] > b[1] ? a : b, ['0', 0])[0]
    return vehicles.find(v => v.id === parseInt(mostChangesVehicleId)) || null
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

  const handleEdit = (record: TireRecord) => {
    setEditingRecord(record)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingRecordId(id)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingRecordId) {
      const { error } = await supabase
        .from('tire_records')
        .delete()
        .eq('id', deletingRecordId)
        .eq('user_id', userId)
      if (error) {
        toast({
          title: "Hata",
          description: "Lastik kaydı silinirken bir hata oluştu.",
          variant: "destructive",
        })
      } else {
        setTireRecords(tireRecords.filter(record => record.id !== deletingRecordId))
        toast({
          title: "Başarılı",
          description: "Lastik kaydı başarıyla silindi.",
        })
      }
    }
    setIsDeleteAlertOpen(false)
    setDeletingRecordId(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRecord && userId) {
      const { error } = await supabase
        .from('tire_records')
        .update({ ...editingRecord, user_id: userId })
        .eq('id', editingRecord.id)
        .eq('user_id', userId)
      
      if (error) {
        toast({
          title: "Hata",
          description: "Lastik kaydı güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      } else {
        setTireRecords(tireRecords.map(record => 
          record.id === editingRecord.id ? editingRecord : record
        ))
        setIsEditDialogOpen(false)
        toast({
          title: "Başarılı",
          description: "Lastik kaydı başarıyla güncellendi.",
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
          const data = XLSX.utils.sheet_to_json(ws)
          
          const importedRecords = data.map((record: any, index: number) => {
            const vehicle = vehicles.find(v => v.plate === record['Araç Plakası'])
            if (!vehicle) {
              throw new Error(`Geçersiz araç plakası: ${record['Araç Plakası']}`)
            }
            setImportProgress((index + 1) / data.length * 100)
            setImportedRecordsCount(index + 1)

            return {
              date: new Date(record['Tarih']).toISOString(),
              vehicle_id: vehicle.id,
              tire_position: record['Lastik Pozisyonu'],
              tire_brand: record['Lastik Markası'],
              tire_size: record['Lastik Ebatı'],
              tire_type: record['Lastik Tipi'],
              change_km: parseInt(record['Değişim KM']),
              removed_tire: record['Çıkarılan Lastik'],
              installed_tire: record['Takılan Lastik'],
              removed_tire_km: parseInt(record['Çıkarılan Lastik KM']),
              installed_tire_km: parseInt(record['Takılan Lastik KM']),
              user_id: userId
            }
          })

          if (importedRecords.length > 0) {
            const { data: insertedData, error } = await supabase
              .from('tire_records')
              .insert(importedRecords)
              .select()
            if (error) throw error
            setTireRecords([...tireRecords, ...(insertedData || [])])
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
          toast({
            title: "Hata",
            description: "Veriler içe aktarılırken bir hata oluştu: " + (error as Error).message,
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
      'Lastik Pozisyonu': record.tire_position,
      'Lastik Markası': record.tire_brand,
      'Lastik Ebatı': record.tire_size,
      'Lastik Tipi': record.tire_type,
      'Değişim KM': record.change_km,
      'Çıkarılan Lastik': record.removed_tire,
      'Takılan Lastik': record.installed_tire,
      'Çıkarılan Lastik KM': record.removed_tire_km,
      'Takılan Lastik KM': record.installed_tire_km,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Lastik Kayıtları")
    XLSX.writeFile(wb, "lastik_kayitlari.xlsx")
  }

  const handleTemplateDownload = () => {
    const template = [
      {
        'Tarih': '01.01.2023',
        'Araç Plakası': '34ABC123',
        'Lastik Pozisyonu': 'Ön Sol',
        'Lastik Markası': 'Örnek Marka',
        'Lastik Ebatı': '205/55R16',
        'Lastik Tipi': 'Yaz',
        'Değişim KM': '50000',
        'Çıkarılan Lastik': 'Eski Lastik',
        'Takılan Lastik': 'Yeni Lastik',
        'Çıkarılan Lastik KM': '45000',
        'Takılan Lastik KM': '0'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Şablon")
    XLSX.writeFile(wb, "lastik_kayitlari_sablonu.xlsx")
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lastik Kayıtları</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between">
              İşlemler <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]" align="end">
            <DropdownMenuItem onSelect={() => navigate('/add-tire-record')}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Yeni Lastik Kaydı</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/tire-inventory')}>
              <Ruler className="mr-2 h-4 w-4" />
              <span>Lastik Envanteri</span>
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
            <CardTitle className="text-sm font-medium">Toplam Lastik Değişimi</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTireChanges}</div>
            <p className="text-xs text-blue-500">Tüm kayıtlar için toplam lastik değişimi</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Çok Değişen Pozisyon</CardTitle>
            <Ruler className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostChangedTirePosition || 'N/A'}</div>
            <p className="text-xs text-green-500">En sık değişim yapılan lastik pozisyonu</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Değişim KM</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageChangeKm.toFixed(0)} KM</div>
            <p className="text-xs text-yellow-500">Ortalama lastik değişim kilometresi</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Çok Değişim Yapılan Araç</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostTireChangesVehicle?.plate || 'N/A'}</div>
            <p className="text-xs text-orange-500">En fazla lastik değişimi yapılan araç</p>
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
                    <TableHead className="cursor-pointer" onClick={() => handleSort('tire_position')}>
                      Lastik Pozisyonu {sortConfig?.key === 'tire_position' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('tire_brand')}>
                      Lastik Markası {sortConfig?.key === 'tire_brand' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('tire_size')}>
                      Lastik Ebatı {sortConfig?.key === 'tire_size' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('tire_type')}>
                      Lastik Tipi {sortConfig?.key === 'tire_type' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('change_km')}>
                      Değişim KM {sortConfig?.key === 'change_km' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>Çıkarılan Lastik</TableHead>
                    <TableHead>Takılan Lastik</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{vehicles.find(v => v.id === record.vehicle_id)?.plate || '-'}</TableCell>
                      <TableCell>{record.tire_position}</TableCell>
                      <TableCell>{record.tire_brand}</TableCell>
                      <TableCell>{record.tire_size}</TableCell>
                      <TableCell>{record.tire_type}</TableCell>
                      <TableCell>{record.change_km}</TableCell>
                      <TableCell>{record.removed_tire}</TableCell>
                      <TableCell>{record.installed_tire}</TableCell>
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
              <p className="text-gray-500">Henüz lastik kaydı bulunmamaktadır.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredAndSortedRecords.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lastik Kaydını Düzenle</DialogTitle>
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
                  value={editingRecord?.date.split('T')[0] ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, date: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tire_position" className="text-right">
                  Lastik Pozisyonu
                </Label>
                <Input
                  id="tire_position"
                  value={editingRecord?.tire_position ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, tire_position: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tire_brand" className="text-right">
                  Lastik Markası
                </Label>
                <Input
                  id="tire_brand"
                  value={editingRecord?.tire_brand ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, tire_brand: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tire_size" className="text-right">
                  Lastik Ebatı
                </Label>
                <Input
                  id="tire_size"
                  value={editingRecord?.tire_size ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, tire_size: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tire_type" className="text-right">
                  Lastik Tipi
                </Label>
                <Input
                  id="tire_type"
                  value={editingRecord?.tire_type ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, tire_type: e.target.value} : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="change_km" className="text-right">
                  Değişim KM
                </Label>
                <Input
                  id="change_km"
                  type="number"
                  value={editingRecord?.change_km ?? ''}
                  onChange={(e) => setEditingRecord(prev => prev ? {...prev, change_km: parseInt(e.target.value)}  : null)}
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
              Bu lastik kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
            <DialogTitle className="text-xl font-semibold">Lastik Kayıtlarını İçeri Aktar</DialogTitle>
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
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 max-w-md">
              <li>Hazırladığımız Excel şablonunu indirin.</li>
              <li>Lastik kayıtlarınızı şablona aktarın.</li>
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