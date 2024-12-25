'use client'

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, FileUp, FileDown, Download, Upload, X, ArrowUpDown, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Car, Calendar, AlertTriangle, CheckCircle, BarChart3, Activity, Timer } from 'lucide-react'

interface Vehicle {
  id: number
  plate: string
  make: string
  model: string
  year: number
  type: string
  visaValidUntil: string
  status: boolean
  isVehicleSubjectToVisa: boolean
  fuelType: string
  color: string
  currentKm: number
  ticariad: string
  egzozMuayeneTarihi: string
  trafigeGikisTarihi: string
  user_id: string
}

export default function VehicleManagement() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importedVehiclesCount, setImportedVehiclesCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vehicle; direction: 'ascending' | 'descending' } | null>(null)
  const { toast } = useToast()

  const ITEMS_PER_PAGE = 7

  useEffect(() => {
    fetchVehicles()
  }, [])

  useEffect(() => {
    if (error) {
      toast({
        title: "Hata",
        description: error,
        variant: "destructive",
      })
    }
  }, [error, toast])

  const fetchVehicles = async () => {
    setStatus('loading')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Kullanıcı oturumu bulunamadı')
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) throw error

      setVehicles(data || [])
      setStatus('succeeded')
    } catch (error) {
      setError((error as Error).message)
      setStatus('failed')
    }
  }

  const handleSort = (key: keyof Vehicle) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const filteredAndSortedVehicles = React.useMemo(() => {
    let result = vehicles.filter(vehicle => 
      (vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
       vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
       vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === 'all' || vehicle.type === filterType)
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
  }, [vehicles, searchTerm, filterType, sortConfig])

  const totalPages = Math.ceil(filteredAndSortedVehicles.length / ITEMS_PER_PAGE)
  const paginatedVehicles = filteredAndSortedVehicles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const stats = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status).length,
    expiringVisa: vehicles.filter(v => {
      if (!v.visaValidUntil) return false;
      const visaDate = new Date(v.visaValidUntil);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return visaDate <= thirtyDaysFromNow;
    }).length,
    needsMaintenance: vehicles.filter(v => v.currentKm > 10000).length,
  }

  const getMostCommonVehicleType = () => {
    if (vehicles.length === 0) return 'N/A';
    const typeCounts = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.type] = (acc[vehicle.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };

  const handleDelete = async (id: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Hata",
          description: "Kullanıcı oturumu bulunamadı.",
          variant: "destructive",
        })
        return
      }

      // Call the RPC function to delete the vehicle and its tires
      const { error } = await supabase.rpc('delete_vehicle_and_tires', { p_vehicle_id: id })

      if (error) {
        console.error('Error deleting vehicle and tires:', error)
        toast({
          title: "Hata",
          description: error.message || "Araç ve ilişkili lastikler silinirken bir hata oluştu.",
          variant: "destructive",
        })
        return
      }

      setVehicles(vehicles.filter(vehicle => vehicle.id !== id))
      toast({
        title: "Başarılı",
        description: "Araç ve ilişkili lastikler başarıyla silindi.",
      })
    } catch (error) {
      console.error('Unexpected error:', error)
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (evt: ProgressEvent<FileReader>) => {
        try {
          const bstr = evt.target?.result
          if (typeof bstr !== 'string') {
            throw new Error('Failed to read file as string')
          }
          const wb = XLSX.read(bstr, { type: 'binary' })
          const wsname = wb.SheetNames[0]
          const ws = wb.Sheets[wsname]
          const data = XLSX.utils.sheet_to_json(ws)
          
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('Kullanıcı oturumu bulunamadı')
          }

          const importedVehicles = data.map((vehicle: any, index: number) => {
            setImportProgress((index + 1) / data.length * 100)
            setImportedVehiclesCount(index + 1)

            const parseDate = (dateString: string) => {
              if (!dateString) return '';
              const parts = dateString.split('.');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              return dateString;
            };

            return {
              plate: vehicle['Plaka'] || '',
              make: vehicle['Marka'] || '',
              model: vehicle['Model'] || '',
              year: parseInt(vehicle.Yıl) || new Date().getFullYear(),
              type: vehicle['Tip'] || '',
              visaValidUntil: parseDate(vehicle['Vize Geçerlilik Tarihi']),
              status: vehicle['Sahiplik'] === '',
              isVehicleSubjectToVisa: vehicle['Vizeye Tabi'] === 'Evet',
              fuelType: vehicle['Yakıt Türü'] || '',
              color: vehicle['Renk'] || '',
              currentKm: parseInt(vehicle['Mevcut KM']) || 0,
              ticariad: vehicle['Ticari Adı'] || '',
              egzozMuayeneTarihi: parseDate(vehicle['Egzoz Muayene Tarihi']),
              trafigeGikisTarihi: parseDate(vehicle['Trafiğe Çıkış Tarihi']),
              user_id: user.id
            }
          })

          const { data: insertedData, error } = await supabase
            .from('vehicles')
            .insert(importedVehicles)
            .select()

          if (error) throw error

          setVehicles([...vehicles, ...(insertedData || [])])
          toast({
            title: "Başarılı",
            description: `${importedVehicles.length} araç başarıyla içe aktarıldı.`,
          })
          setIsImportDialogOpen(false)
        } catch (error) {
          toast({
            title: "Hata",
            description: "Veriler içe aktarılırken bir hata oluştu: " + (error as Error).message,
            variant: "destructive",
          })
        }
        setImportProgress(0)
        setImportedVehiclesCount(0)
      }
      reader.readAsBinaryString(file)
    }
  }

  const handleExcelExport = () => {
    const exportData = filteredAndSortedVehicles.map(vehicle => ({
      'Plaka': vehicle.plate,
      'Marka': vehicle.make,
      'Model': vehicle.model,
      'Yıl': vehicle.year,
      'Tip': vehicle.type,
      'Vize Geçerlilik Tarihi': formatDateForExport(vehicle.visaValidUntil),
      'Sahiplik': vehicle.status,
      'Vizeye Tabi': vehicle.isVehicleSubjectToVisa ? 'Evet' : 'Hayır',
      'Yakıt Türü': vehicle.fuelType,
      'Renk': vehicle.color,
      'Mevcut KM': vehicle.currentKm,
      'Ticari Adı': vehicle.ticariad,
      'Egzoz Muayene Tarihi': formatDateForExport(vehicle.egzozMuayeneTarihi),
      'Trafiğe Çıkış Tarihi': formatDateForExport(vehicle.trafigeGikisTarihi),
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Araçlar")
    XLSX.writeFile(wb, "araclar.xlsx")
  }

  const handleTemplateDownload = () => {
    const template = [
      {
        'Plaka': '34ABC123',
        'Marka': 'TOYOTA',
        'Model': 'COROLLA',
        'Yıl': '2022',
        'Tip': 'OTOMOBİL',
        'Vize Geçerlilik Tarihi': '31.12.2023',
        'Sahiplik': 'ÖZMAL',
        'Vizeye Tabi': 'Evet',
        'Yakıt Türü': 'BENZİN',
        'Renk': 'BEYAZ',
        'Mevcut KM': '10000',
        'Ticari Adı': 'TOYOTA COROLA ASD',
        'Egzoz Muayene Tarihi': '31.12.2023',
        'Trafiğe Çıkış Tarihi': '01.01.2022',
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Şablon")
    XLSX.writeFile(wb, "arac_kayitlari_sablonu.xlsx")
  }

  const formatDateForExport = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `
${day}.${month}.${year}`;
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kayıtlı Araçlarım</h1>
        <Button onClick={() => navigate('/vehicles/add')}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Araç Tanımla
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <Card className="bg-white text-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Toplam Araç</CardTitle>
      <Car className="h-4 w-4 text-blue-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.totalVehicles}</div>
      <p className="text-xs text-blue-500">Sistemde kayıtlı araç sayısı</p>
    </CardContent>
  </Card>

  <Card className="bg-white text-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Aktif Araçlar</CardTitle>
      <BarChart3 className="h-4 w-4 text-green-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.activeVehicles}</div>
      <p className="text-xs text-green-500">Aktif araç sayısı</p>
    </CardContent>
  </Card>

  <Card className="bg-white text-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Vizesi Yaklaşanlar</CardTitle>
      <Activity className="h-4 w-4 text-yellow-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.expiringVisa}</div>
      <p className="text-xs text-yellow-500">30 gün içinde vizesi dolacak araçlar</p>
    </CardContent>
  </Card>

  <Card className="bg-white text-gray-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">En Çok Bulunan Tip</CardTitle>
      <Timer className="h-4 w-4 text-orange-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{getMostCommonVehicleType()}</div>
      <p className="text-xs text-orange-500">En yaygın araç tipi</p>
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
            <SelectItem value="all">Tüm Araçlar</SelectItem>
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
        <div className="flex space-x-2">
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" /> İçe Aktar
          </Button>
          <Button onClick={handleExcelExport}>
            <FileDown className="mr-2 h-4 w-4" /> Dışa Aktar
          </Button>
        </div>
      </div>

      {status === 'loading' && <Progress value={importProgress} className="w-full" />}
      {status === 'failed' && <p className="text-red-500">Hata: {error}</p>}
      {status === 'succeeded' && (
        <Card>
          <CardContent>
            {paginatedVehicles.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort('plate')}>
                        Plaka {sortConfig?.key === 'plate' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('make')}>
                        Marka {sortConfig?.key === 'make' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('model')}>
                        Model {sortConfig?.key === 'model' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer text-center" onClick={() => handleSort('year')}>
                        Yıl {sortConfig?.key === 'year' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                        Tip {sortConfig?.key === 'type' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVehicles.map((vehicle) => (
                      <TableRow 
                        key={vehicle.id} 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                      >
                        <TableCell className="font-medium">{vehicle.plate}</TableCell>
                        <TableCell>{vehicle.make}</TableCell>
                        <TableCell>{vehicle.model}</TableCell>
                        <TableCell className="text-center">{vehicle.year}</TableCell>
                        <TableCell>{vehicle.type}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="mr-2" 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vehicles/edit/${vehicle.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Düzenle</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingVehicleId(vehicle.id);
                              setIsDeleteAlertOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Sil</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">Henüz araç kaydı bulunmamaktadır.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
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
            } else if (page === currentPage - 3 || page === currentPage + 3) {
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
          Toplam {filteredAndSortedVehicles.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedVehicles.length)} arası gösteriliyor
        </div>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu aracı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deletingVehicleId) {
                handleDelete(deletingVehicleId);
              }
              setIsDeleteAlertOpen(false);
            }}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[490px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Araçları İçeri Aktar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="flex justify-center items-center w-full space-x-8">
              <div className="text-center">
                <Download className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium">Excel şablonunu <div>indirin</div></p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-gray-300" />
              <div className="text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium">Doldurulmuş şablonu <div>yükleyin</div></p>
              </div>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 max-w-md">
              <li>Hazırladığımız Excel şablonunu indirin.</li>
              <li>Araç bilgilerini şablona aktarın.</li>
              <li>Araç tiplerini doğru girdiğinizden emin olun.</li>
              <li>Doldurulan şablonu yükleyin.</li>
            </ol>
            {importProgress > 0 && (
              <div className="w-full space-y-2">
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-center">{importedVehiclesCount} araç işlendi</p>
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
              <Button onClick={() => document.getElementById('file-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Dosya Yükle
              </Button>
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleExcelImport}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

