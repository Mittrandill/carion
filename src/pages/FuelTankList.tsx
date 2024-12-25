'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, ArrowUpDown, Edit, Trash2, ChevronLeft, ChevronRight, Fuel, BarChart3, Activity, Timer } from 'lucide-react';

interface FuelTank {
  id: number;
  name: string;
  fuelType: string;
  currentAmount: number;
  capacity: number;
  counterInfo: string;
  user_id: string;
}

export default function FuelTankList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fuelTanks, setFuelTanks] = useState<FuelTank[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tankToDelete, setTankToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof FuelTank; direction: 'ascending' | 'descending' } | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 7;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFuelTanks();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const fetchFuelTanks = async () => {
    if (!currentUser) return;
    setStatus('loading');
    try {
      const { data, error } = await supabase
        .from('fuel_tanks')
        .select('*')
        .eq('user_id', currentUser);
      if (error) throw error;
      setFuelTanks(data);
      setStatus('succeeded');
    } catch (error) {
      setError('Failed to fetch fuel tanks');
      setStatus('failed');
    }
  };

  const stats = {
    totalTanks: fuelTanks.length,
    totalCapacity: fuelTanks.reduce((sum, tank) => sum + tank.capacity, 0),
    totalCurrentAmount: fuelTanks.reduce((sum, tank) => sum + tank.currentAmount, 0),
    mostCommonFuelType: (() => {
      if (fuelTanks.length === 0) return 'N/A';
      const typeCounts = fuelTanks.reduce((acc, tank) => {
        acc[tank.fuelType] = (acc[tank.fuelType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    })()
  };

  const handleSort = (key: keyof FuelTank) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' };
      }
      return { key, direction: 'ascending' };
    });
  };

  const filteredAndSortedTanks = useMemo(() => {
    let result = fuelTanks.filter(tank => 
      tank.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === 'all' || tank.fuelType === filterType)
    );

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [fuelTanks, searchTerm, filterType, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedTanks.length / ITEMS_PER_PAGE);
  const paginatedTanks = filteredAndSortedTanks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = (id: number) => {
    setTankToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (tankToDelete) {
      try {
        const { error } = await supabase
          .from('fuel_tanks')
          .delete()
          .eq('id', tankToDelete);
        if (error) throw error;
        setFuelTanks(fuelTanks.filter(tank => tank.id !== tankToDelete));
        toast({
          title: "Başarılı",
          description: "Yakıt deposu başarıyla silindi.",
        });
      } catch (error) {
        toast({
          title: "Hata",
          description: "Yakıt deposu silinirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setTankToDelete(null);
  };

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Yakıt Depo/Stoklarım</h1>
        <Button onClick={() => navigate('/fuel-tank-definition')}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Depo Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Depo</CardTitle>
            <Fuel className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTanks}</div>
            <p className="text-xs text-blue-500">Sistemde kayıtlı depo sayısı</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kapasite</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCapacity} Lt</div>
            <p className="text-xs text-green-500">Toplam depo kapasitesi</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mevcut Stok</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCurrentAmount} Lt</div>
            <p className="text-xs text-yellow-500">Toplam mevcut yakıt miktarı</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Çok Bulunan Yakıt</CardTitle>
            <Timer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostCommonFuelType}</div>
            <p className="text-xs text-orange-500">En yaygın yakıt türü</p>
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
            <SelectValue placeholder="Yakıt Türü Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Yakıt Türleri</SelectItem>
            <SelectItem value="Benzin">Benzin</SelectItem>
            <SelectItem value="Dizel">Dizel</SelectItem>
            <SelectItem value="LPG">LPG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'loading' && <Progress value={0} className="w-full" />}
      {status === 'failed' && <p className="text-red-500">Error: {error}</p>}
      {status === 'succeeded' && (
        <Card>
          <CardContent>
            {paginatedTanks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        Depo Adı {sortConfig?.key === 'name' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('fuelType')}>
                        Yakıt Türü {sortConfig?.key === 'fuelType' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('currentAmount')}>
                        Mevcut Stok {sortConfig?.key === 'currentAmount' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('capacity')}>
                        Kapasite {sortConfig?.key === 'capacity' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('counterInfo')}>
                        Sayaç Bilgisi {sortConfig?.key === 'counterInfo' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                      </TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTanks.map((tank) => (
                      <TableRow 
                        key={tank.id} 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => navigate(`/fuel-tanks/${tank.id}`)}
                      >
                        <TableCell className="font-medium">{tank.name}</TableCell>
                        <TableCell>{tank.fuelType}</TableCell>
                        <TableCell>{tank.currentAmount} Lt</TableCell>
                        <TableCell>{tank.capacity} Lt</TableCell>
                        <TableCell>{tank.counterInfo}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="mr-2" 
                            onClick={(e) => { 
                              e.stopPropagation();
                              navigate(`/fuel-tank-definition/${tank.id}`);
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
                              handleDelete(tank.id);
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
                <p className="text-gray-500">Henüz yakıt deposu kaydı bulunmamaktadır.</p>
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
          Toplam {filteredAndSortedTanks.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTanks.length)} arası gösteriliyor
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu yakıt deposunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

