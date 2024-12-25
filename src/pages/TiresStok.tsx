'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, ArrowUpDown, FileUp, FileDown, Download, Upload, X, Ruler, Package, TrendingUp, Truck, ChevronDown, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TireInventory {
  id: number;
  brand: string;
  type: string;
  pattern: string;
  size: string;
  condition: string;
  serial_number: string;
  dot_number: string;
  estimated_lifetime: number;
  purchase_date: string;
  price: number | null;
  supplier: string;
  quantity: number;
  user_id: string;
}

export default function TireInventory() {
  const navigate = useNavigate();
  const [tireInventory, setTireInventory] = useState<TireInventory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingInventory, setEditingInventory] = useState<TireInventory | null>(null)
  const [deletingInventoryId, setDeletingInventoryId] = useState<number | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: keyof TireInventory; direction: 'ascending' | 'descending' } | null>(null)
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
      fetchTireInventory()
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

  const fetchTireInventory = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('tire_stocks')
      .select('*')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching tire inventory:', error)
      toast({
        title: "Error",
        description: "Failed to fetch tire inventory. Please try again.",
        variant: "destructive",
      })
    } else {
      const formattedData = data?.map(item => ({
        ...item,
        price: item.price != null ? Number(item.price) : null,
        estimated_lifetime: item.estimated_lifetime != null ? Number(item.estimated_lifetime) : null
      })) || []
      setTireInventory(formattedData)
    }
  }

  const filteredAndSortedInventory = useMemo(() => {
    let result = tireInventory.filter((item: TireInventory) => {
      return (item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.size.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterType === 'all' || item.type === filterType)
    })

    if (sortConfig !== null) {
      result.sort((a: TireInventory, b: TireInventory) => {
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
  }, [tireInventory, searchTerm, filterType, sortConfig])

  const totalTires = useMemo(() => {
    return filteredAndSortedInventory.reduce((sum, item) => sum + Number(item.quantity), 0)
  }, [filteredAndSortedInventory])

  const totalValue = useMemo(() => {
    return filteredAndSortedInventory.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0)
  }, [filteredAndSortedInventory])

  const mostCommonSize = useMemo(() => {
    const sizeCounts = filteredAndSortedInventory.reduce((acc, item) => {
      acc[item.size] = (acc[item.size] || 0) + item.quantity
      return acc
    }, {} as Record<string, number>)
    return Object.entries(sizeCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0]
  }, [filteredAndSortedInventory])

  const lowStockItems = useMemo(() => {
    return filteredAndSortedInventory.filter(item => item.quantity < 5).length
  }, [filteredAndSortedInventory])

  const paginatedInventory = filteredAndSortedInventory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(filteredAndSortedInventory.length / ITEMS_PER_PAGE)

  const handleSort = (key: keyof TireInventory) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const handleEdit = (inventory: TireInventory) => {
    setEditingInventory(inventory)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingInventoryId(id)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingInventoryId) {
      const { error } = await supabase
        .from('tire_stocks')
        .delete()
        .eq('id', deletingInventoryId)
        .eq('user_id', userId)
      if (error) {
        toast({
          title: "Hata",
          description: "Lastik envanteri silinirken bir hata oluştu.",
          variant: "destructive",
        })
      } else {
        setTireInventory(tireInventory.filter(item => item.id !== deletingInventoryId))
        toast({
          title: "Başarılı",
          description: "Lastik envanteri başarıyla silindi.",
        })
      }
    }
    setIsDeleteAlertOpen(false)
    setDeletingInventoryId(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingInventory && userId) {
      const { error } = await supabase
        .from('tire_stocks')
        .update({ ...editingInventory, user_id: userId })
        .eq('id', editingInventory.id)
        .eq('user_id', userId)
      
      if (error) {
        toast({
          title: "Hata",
          description: "Lastik envanteri güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      } else {
        setTireInventory(tireInventory.map(item => 
          item.id === editingInventory.id ? editingInventory : item
        ))
        setIsEditDialogOpen(false)
        toast({
          title: "Başarılı",
          description: "Lastik envanteri başarıyla güncellendi.",
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
          
          const importedInventory = data.map((item: any, index: number) => {
            setImportProgress((index + 1) / data.length * 100)
            setImportedRecordsCount(index + 1)

            return {
              brand: item['Marka'],
              type: item['Tip'],
              pattern: item['Desen'],
              size: item['Ebat'],
              condition: item['Durum'],
              serial_number: item['Seri No'],
              dot_number: item['DOT No'],
              estimated_lifetime: parseInt(item['Lastik Ömrü']),
              purchase_date: new Date(item['Satın Alma Tarihi']).toISOString(),
              price: parseFloat(item['Fiyat']),
              supplier: item['Tedarikçi'],
              quantity: parseInt(item['Miktar']),
              user_id: userId
            }
          })

          if (importedInventory.length > 0) {
            const { data: insertedData, error } = await supabase
              .from('tire_stocks')
              .insert(importedInventory)
              .select()
            if (error) throw error
            setTireInventory([...tireInventory, ...(insertedData || [])])
            toast({
              title: "Başarılı",
              description: `${importedInventory.length} kayıt başarıyla içe aktarıldı.`,
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
    const exportData = filteredAndSortedInventory.map(item => ({
      'Marka': item.brand,
      'Tip': item.type,
      'Desen': item.pattern,
      'Ebat': item.size,
      'Durum': item.condition,
      'Seri No': item.serial_number,
      'DOT No': item.dot_number,
      'Lastik Ömrü': item.estimated_lifetime,
      'Satın Alma Tarihi': new Date(item.purchase_date).toLocaleDateString('tr-TR'),
      'Fiyat': item.price,
      'Tedarikçi': item.supplier,
      'Miktar': item.quantity,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Lastik Envanteri")
    XLSX.writeFile(wb, "lastik_envanteri.xlsx")
  }

  const handleTemplateDownload = () => {
    const template = [
      {
        'Marka': 'Örnek Marka',
        'Tip': 'Yaz',
        'Desen': 'Örnek Desen',
        'Ebat': '205/55R16',
        'Durum': 'Yeni',
        'Seri No': 'ABC123',
        'DOT No': 'DOT123',
        'Lastik Ömrü': '50000',
        'Satın Alma Tarihi': '01.01.2023',
        'Fiyat': '500',
        'Tedarikçi': 'Örnek Tedarikçi',
        'Miktar': '10'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Şablon")
    XLSX.writeFile(wb, "lastik_envanteri_sablonu.xlsx")
  }

  const handleTireStockUpdate = async (tireId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('tire_stocks')
        .update({ quantity })
        .eq('id', tireId)
        .eq('user_id', userId);

      if (error) throw error;

      setTireInventory(prev => 
        prev.map(tire => 
          tire.id === parseInt(tireId) ? { ...tire, quantity } : tire
        )
      );

      toast({
        title: "Başarılı",
        description: "Lastik stok miktarı güncellendi.",
      });
    } catch (error) {
      console.error('Error updating tire stock:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lastik stok miktarı güncellenirken bir hata oluştu.",
      });
    }
  };


  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lastik Envanteri</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between">
              İşlemler <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]" align="end">
            <DropdownMenuItem onSelect={() => navigate('/add-tire-inventory')}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Yeni Lastik Ekle</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/tire-records')}>
              <Ruler className="mr-2 h-4 w-4" />
              <span>Lastik Kayıtları</span>
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
            <CardTitle className="text-sm font-medium">Toplam Lastik Sayısı</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTires}</div>
            <p className="text-xs text-blue-500">Envanterdeki toplam lastik sayısı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Envanter Değeri</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toFixed(2)} TL</div>
            <p className="text-xs text-green-500">Tüm lastiklerin toplam değeri</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Yaygın Ebat</CardTitle>
            <Ruler className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostCommonSize || 'N/A'}</div>
            <p className="text-xs text-yellow-500">En çok bulunan lastik ebatı</p>
          </CardContent>
        </Card>
        <Card className="bg-white text-gray">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Düşük Stok Uyarısı</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-orange-500">5'ten az kalan lastik çeşidi</p>
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
            <SelectValue placeholder="Lastik Tipi Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            <SelectItem value="Yaz">Yaz</SelectItem>
            <SelectItem value="Kış">Kış</SelectItem>
            <SelectItem value="4 Mevsim">4 Mevsim</SelectItem>
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
          {paginatedInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('brand')}>
                      Marka {sortConfig?.key === 'brand' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                      Tip {sortConfig?.key === 'type' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('pattern')}>
                      Desen {sortConfig?.key === 'pattern' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('size')}>
                      Ebat {sortConfig?.key === 'size' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('condition')}>
                      Durum {sortConfig?.key === 'condition' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('serial_number')}>
                      Seri No {sortConfig?.key === 'serial_number' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('dot_number')}>
                      DOT No {sortConfig?.key === 'dot_number' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('estimated_lifetime')}>
                      Lastik Ömrü {sortConfig?.key === 'estimated_lifetime' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('purchase_date')}>
                      Satın Alma Tarihi {sortConfig?.key === 'purchase_date' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('price')}>
                      Fiyat (TL) {sortConfig?.key === 'price' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('supplier')}>
                      Tedarikçi {sortConfig?.key === 'supplier' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('quantity')}>
                      Miktar {sortConfig?.key === 'quantity' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                    </TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.pattern}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.condition}</TableCell>
                      <TableCell>{item.serial_number}</TableCell>
                      <TableCell>{item.dot_number}</TableCell>
                      <TableCell>{item.estimated_lifetime}</TableCell>
                      <TableCell>{new Date(item.purchase_date).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>{item.price != null ? item.price.toFixed(2) : 'N/A'}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell>
                        <Input type="number" value={item.quantity} onChange={(e) => handleTireStockUpdate(item.id.toString(), parseInt(e.target.value, 10))} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
              <p className="text-gray-500">Henüz lastik envanteri bulunmamaktadır.</p>
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
          Toplam {filteredAndSortedInventory.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedInventory.length)} arası gösteriliyor
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lastik Envanterini Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              {Object.entries(editingInventory || {}).map(([key, value]) => {
                if (key === 'id' || key === 'user_id') return null;
                return (
                  <div key={key} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={key} className="text-right">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                    </Label>
                    <Input
                      id={key}
                      name={key}
                      value={value as string}
                      onChange={(e) => setEditingInventory(prev => prev ? {...prev, [key]: e.target.value} : null)}
                      className="col-span-3"
                    />
                  </div>
                )
              })}
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
              Bu lastik envanterini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
            <DialogTitle className="text-xl font-semibold">Lastik Envanterini İçeri Aktar</DialogTitle>
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
              <li>Lastik envanteri bilgilerini şablona aktarın.</li>
              <li>Tüm gerekli alanları doldurduğunuzdan emin olun.</li>
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

