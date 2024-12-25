import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { format } from 'date-fns';

interface FuelRecord {
  id: number;
  date: string;
  receiptNo: string;
  station: string;
  amount: number;
  unitPrice: number;
  total: number;
  vehicleId: number;
}

interface Vehicle {
  id: number;
  plate: string;
}

const FuelManagement: React.FC = () => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    receiptNo: '',
    station: '',
    amount: '',
    unitPrice: '',
    vehicleId: '',
  });

  useEffect(() => {
    fetchFuelRecords();
    fetchVehicles();
  }, []);

  const fetchFuelRecords = async () => {
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .order('date', { ascending: false });
    if (error) console.error('Error fetching fuel records:', error);
    else setFuelRecords(data || []);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate');
    if (error) console.error('Error fetching vehicles:', error);
    else setVehicles(data || []);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = {
      ...formData,
      amount: parseFloat(formData.amount),
      unitPrice: parseFloat(formData.unitPrice),
      total: parseFloat(formData.amount) * parseFloat(formData.unitPrice),
      vehicleId: parseInt(formData.vehicleId),
    };
    const { data, error } = await supabase
      .from('fuel_records')
      .insert([newRecord])
      .select();
    if (error) console.error('Error adding fuel record:', error);
    else {
      setFuelRecords([...fuelRecords, data[0]]);
      setIsAddFormOpen(false);
      setFormData({
        date: '',
        receiptNo: '',
        station: '',
        amount: '',
        unitPrice: '',
        vehicleId: '',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Yakıt Yönetimi</h1>
        <Button onClick={() => setIsAddFormOpen(true)}>Yeni Yakıt Kaydı Ekle</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yakıt Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Araç Plakası</TableHead>
                <TableHead>İstasyon</TableHead>
                <TableHead>Miktar (Lt)</TableHead>
                <TableHead>Birim Fiyat (₺)</TableHead>
                <TableHead>Toplam (₺)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), 'dd.MM.yyyy')}</TableCell>
                  <TableCell>{vehicles.find(v => v.id === record.vehicleId)?.plate}</TableCell>
                  <TableCell>{record.station}</TableCell>
                  <TableCell>{record.amount.toFixed(2)}</TableCell>
                  <TableCell>{record.unitPrice.toFixed(2)}</TableCell>
                  <TableCell>{record.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Yakıt Kaydı Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="vehicleId" className="text-right">
                  Araç
                </Label>
                <Select onValueChange={handleSelectChange('vehicleId')} value={formData.vehicleId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Araç seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.plate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="station" className="text-right">
                  İstasyon
                </Label>
                <Input
                  id="station"
                  name="station"
                  value={formData.station}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Miktar (Lt)
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unitPrice" className="text-right">
                  Birim Fiyat (₺)
                </Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receiptNo" className="text-right">
                  Fiş No
                </Label>
                <Input
                  id="receiptNo"
                  name="receiptNo"
                  value={formData.receiptNo}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddFormOpen(false)}>
                İptal
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuelManagement;