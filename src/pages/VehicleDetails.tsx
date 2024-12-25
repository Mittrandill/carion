'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Calendar, Fuel, BarChart, ChevronDown, AlertCircle, Settings, ArrowUpDown, Download, Car, Palette, FileCheck, Truck, CreditCard, Hash, CircleDotIcon } from 'lucide-react'
import { format, differenceInDays, isValid, parseISO, differenceInMonths } from 'date-fns'
import * as XLSX from 'xlsx'
import { FaEdit } from "react-icons/fa";


interface Station {
  id: number;
  value: string;
}

interface Vehicle {
  id: string
  plate: string
  make: string
  model: string
  year: number
  type: string
  visaValidUntil: string
  status: string
  isVehicleSubjectToVisa: boolean
  fuelType: string
  color: string
  currentKm: number
  ticariad: string
  egzozMuayeneTarihi: string
  trafigeGikisTarihi: string
  created_by: string
  created_at: string
  updated_at: string
  user_id: string
  axleCount: number
  tires: { condition: string }[]
  chassisNumber: string
  engineSerialNumber: string
  engineVolume: string
  enginePower: string
  registrationOwnerIdNumber: string
  registrationOwnerName: string
  documentSerialNumber: string
  issuedCity: string
  issuedDistrict: string
  registrationDate: string
  registrationOrderNumber: string
  vehicleClass: string
  netWeight: string
  maxLoadWeight: string
  trailerMaxLoadWeight: string
  seatCount: string
  hgsOgsInfo: string
  hgsOgsPurchaseLocation: string
  hgsOgsRegistrationDate: string
  isSubjectToMtv: string
  mtvJulyPaymentStatus: string
  mtvDecemberPaymentStatus: string
  tireCount: number
  tire_info: any
  lastAxleSingleTire: boolean
}

interface FuelRecord {
  id: number;
  date: string;
  vehicle_id: number;
  tank_id: number | null;
  station: string;
  amount: number;
  unit_price: number;
  total: number;
  receipt_no: string;
  station_type: 'internal' | 'external';
  fuel_type: string;
}

interface ServiceRecord {
  id: string
  date: string
  title: string
  description: string
  cost: number
}

interface KmRecord {
  id: string
  date: string
  km: number
}

interface TireRecord {
  id: string
  date: string
  action: string
  position: string
  brand: string
  model: string
  condition: string
}

const VehicleDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([])
  const [kmRecords, setKmRecords] = useState<KmRecord[]>([])
  const [tireRecords, setTireRecords] = useState<TireRecord[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [fuelTanks, setFuelTanks] = useState<{id: string, name: string}[]>([])
  const [vehicles, setVehicles] = useState<{id: number, plate: string}[]>([])

  const [showAllInfo, setShowAllInfo] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('fuel')

  useEffect(() => {
    fetchVehicleData()
    fetchFuelRecords()
    fetchVehicles()
    fetchFuelTanks()
    fetchStations()
  }, [id])

  const fetchVehicleData = async () => {
    try {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()
  
      if (vehicleError) throw vehicleError
      setVehicle({
        ...vehicleData,
        tires: Array.isArray(vehicleData.tires) ? vehicleData.tires : []
      })

      const { data: serviceData, error: serviceError } = await supabase
        .from('service_records')
        .select('*')
        .eq('vehicleid', id)

      if (serviceError) throw serviceError
      setServiceRecords(serviceData || [])

      const { data: kmData, error: kmError } = await supabase
        .from('km_records')
        .select('*')
        .eq('vehicle_id', id)

      if (kmError) throw kmError
      setKmRecords(kmData || [])

      const { data: tireData, error: tireError } = await supabase
        .from('tire_records')
        .select('*')
        .eq('vehicleId', id)

      if (tireError) throw tireError
      setTireRecords(tireData || [])

    } catch (error) {
      console.error('Error fetching vehicle data:', error)
      setError('Araç verilerini yüklerken bir hata oluştu.')
    }
  }

  const fetchFuelRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_records')
        .select('*')
        .eq('vehicle_id', id)
      if (error) throw error
      setFuelRecords(data || [])
    } catch (error) {
      console.error('Error fetching fuel records:', error)
      setError('Yakıt kayıtlarını yüklerken bir hata oluştu.')
    }
  }

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate')
      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      setError('Araçları yüklerken bir hata oluştu.')
    }
  }

  const fetchFuelTanks = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_tanks')
        .select('id, name')
      if (error) throw error
      setFuelTanks(data || [])
    } catch (error) {
      console.error('Error fetching fuel tanks:', error)
      setError('Yakıt tanklarını yüklerken bir hata oluştu.')
    }
  }

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('type', 'stations')
      
      if (error) throw error;
  
      if (data && data.length > 0) {
        let stationsData = data[0].value;
        if (typeof stationsData === 'string') {
          // If it's a string, try to parse it as JSON
          try {
            stationsData = JSON.parse(stationsData);
          } catch (e) {
            // If parsing fails, treat it as a single station name
            stationsData = [{ id: 1, value: stationsData }];
          }
        }
        
        if (Array.isArray(stationsData)) {
          setStations(stationsData);
        } else if (typeof stationsData === 'object') {
          setStations(Object.entries(stationsData).map(([id, value]) => ({ id, value })));
        } else {
          console.error('Unexpected stations data format:', stationsData);
          setStations([]);
        }
      } else {
        setStations([]);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setError('İstasyonları yüklerken bir hata oluştu.');
    }
  };

  const sortedFuelRecords = useMemo(() => {
    let result = [...fuelRecords]

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key as keyof FuelRecord] < b[sortConfig.key as keyof FuelRecord]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key as keyof FuelRecord] > b[sortConfig.key as keyof FuelRecord]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return result
  }, [fuelRecords, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig && prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }

  const paginateRecords = (records: any[]) => {
    const startIndex = (currentPage - 1) * 7
    return records.slice(startIndex, startIndex + 7)
  }

  const exportToExcel = (records: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(records)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
  }

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    return isValid(date) ? format(date, 'dd.MM.yyyy') : ''
  }

  const calculateDaysLeft = (dateString: string) => {
    const date = parseISO(dateString)
    return isValid(date) ? differenceInDays(date, new Date()) : '-'
  }

  const renderVehicleInfo = () => {
    if (!vehicle) return null
    return (
      <Tabs defaultValue="basic" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
          <TabsTrigger value="technical">Teknik Bilgiler</TabsTrigger>
          <TabsTrigger value="registration">Tescil Bilgileri</TabsTrigger>
          <TabsTrigger value="other">Diğer Bilgiler</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <Truck className="mr-2 h-4 w-4" />
                Araç Tipi
              </p>
              <p className="font-medium">{vehicle.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <Fuel className="mr-2 h-4 w-4" />
                Yakıt Türü
              </p>
              <p className="font-medium">{vehicle.fuelType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <Palette className="mr-2 h-4 w-4" />
                Renk
              </p>
              <p className="font-medium">{vehicle.color}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Sahiplik
              </p>
              <p className={`font-medium ${vehicle.status ? 'text-green-500' : 'text-red-500'}`}>
                {vehicle.status ? 'ÖZMAL' : 'KİRALIK'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <FileCheck className="mr-2 h-4 w-4" />
                Vize Geçerlilik Tarihi
              </p>
              <p className="font-medium">{formatDate(vehicle.visaValidUntil)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Trafiğe Çıkış Tarihi
              </p>
              <p className="font-medium">{formatDate(vehicle.trafigeGikisTarihi)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                Egzoz Muayene Tarihi
              </p>
              <p className="font-medium">{formatDate(vehicle.egzozMuayeneTarihi)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Calendar className="mr-2 h-4 w-4 inline" />
                Tescil Tarihi
              </p>
              <p className="font-medium">{formatDate(vehicle.registrationDate)}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="technical" className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Hash className="mr-2 h-4 w-4 inline" />
                Şasi No
              </p>
              <p className="font-medium">{vehicle.chassisNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Hash className="mr-2 h-4 w-4 inline" />
                Motor Seri No
              </p>
              <p className="font-medium">{vehicle.engineSerialNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Motor Hacmi
              </p>
              <p className="font-medium">{vehicle.engineVolume || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Motor Gücü
              </p>
              <p className="font-medium">{vehicle.enginePower || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Net Ağırlık
              </p>
              <p className="font-medium">{vehicle.netWeight || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Azami Yük Ağırlığı
              </p>
              <p className="font-medium">{vehicle.maxLoadWeight || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Römork Azami Yük
              </p>
              <p className="font-medium">{vehicle.trailerMaxLoadWeight || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Koltuk Sayısı
              </p>
              <p className="font-medium">{vehicle.seatCount || '-'}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="registration" className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                Tescil Sahibi TC
              </p>
              <p className="font-medium">{vehicle.registrationOwnerIdNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                Tescil Sahibi Adı
              </p>
              <p className="font-medium">{vehicle.registrationOwnerName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                Belge Seri No
              </p>
              <p className="font-medium">{vehicle.documentSerialNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                Tescil Sıra No
              </p>
              <p className="font-medium">{vehicle.registrationOrderNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                Tescil İli
              </p>
              <p className="font-medium">{vehicle.issuedCity || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                Tescil İlçesi
              </p>
              <p className="font-medium">{vehicle.issuedDistrict || '-'}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="other" className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                HGS/OGS Bilgisi
              </p>
              <p className="font-medium">{vehicle.hgsOgsInfo || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                HGS/OGS Alım Yeri
              </p>
              <p className="font-medium">{vehicle.hgsOgsPurchaseLocation || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Calendar className="mr-2 h-4 w-4 inline" />
                HGS/OGS Kayıt Tarihi
              </p>
              <p className="font-medium">{formatDate(vehicle.hgsOgsRegistrationDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                MTV Tabi
              </p>
              <p className="font-medium">{vehicle.isSubjectToMtv || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                MTV Temmuz Ödemesi
              </p>
              <p className="font-medium">{vehicle.mtvJulyPaymentStatus || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <FileCheck className="mr-2 h-4 w-4 inline" />
                MTV Aralık Ödemesi
              </p>
              <p className="font-medium">{vehicle.mtvDecemberPaymentStatus || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Araç Sınıfı
              </p>
              <p className="font-medium">{vehicle.vehicleClass || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Aks Sayısı
              </p>
              <p className="font-medium">{vehicle.axleCount || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Lastik Sayısı
              </p>
              <p className="font-medium">{vehicle.tireCount || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                <Settings className="mr-2 h-4 w-4 inline" />
                Son Aks Tek Lastik
              </p>
              <p className="font-medium">{vehicle.lastAxleSingleTire ? 'Evet' : 'Hayır'}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    )
  }

  const renderTireInfo = () => {
    if (!vehicle || !vehicle.tires || !Array.isArray(vehicle.tires)) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {vehicle.tires.map((tire, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1 flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Lastik {index + 1}
            </p>
            <p className="font-medium">{tire.condition}</p>
          </div>
        ))}
      </div>
    );
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!vehicle) {
    return <div className="p-4">Yükleniyor...</div>;
  }

  // Replace the existing calculations with:
  const totalFuelConsumption = fuelRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalFuelCost = fuelRecords.reduce((sum, record) => sum + record.total, 0)

  // Get the earliest and latest fuel record dates
  const fuelDates = fuelRecords.map(record => new Date(record.date))
  const earliestFuelDate = fuelDates.length > 0 ? new Date(Math.min(...fuelDates)) : new Date()
  const latestFuelDate = fuelDates.length > 0 ? new Date(Math.max(...fuelDates)) : new Date()
  const monthsBetweenFuelRecords = differenceInMonths(latestFuelDate, earliestFuelDate) || 1

  const averageFuelConsumption = totalFuelConsumption / monthsBetweenFuelRecords
  const averageFuelCost = totalFuelCost / monthsBetweenFuelRecords
  const visaDaysLeft = calculateDaysLeft(vehicle.visaValidUntil)
  const visaProgress = Math.max(0, Math.min(100, (visaDaysLeft / 365) * 100))

  const sortedKmRecords = [...kmRecords].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" className="flex items-center" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Araçlara Geri Dön
        </Button>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-between">
                İşlemler <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px]" align="end">
              <DropdownMenuItem onSelect={() => navigate(`/vehicle-fuel-entry?vehicleId=${id}`)}>
                <Fuel className="mr-2 h-4 w-4" />
                <span>Yakıt Girişi</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`/km-records?vehicleId=${id}`)}>
                <BarChart className="mr-2 h-4 w-4" />
                <span>Km Kaydı</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`/visa?vehicleId=${id}`)}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Vize/Muayene Kaydı</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`/tire-records?vehicleId=${id}`)}>
                <CircleDotIcon className="mr-2 h-4 w-4" />
                <span>Lastik Kaydı</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(`/vehicles/edit/${vehicle.id}`)}>
                <FaEdit className="mr-2 h-4 w-4" />
                <span>Aracı Düzenle</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">{vehicle.plate}</h2>
              <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} - {vehicle.year}</p>
            </div>
            <Button variant="link" onClick={() => setShowAllInfo(!showAllInfo)}>
              {showAllInfo ? 'Detayları Gizle' : 'Detayları Göster'}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showAllInfo ? 'transform rotate-180' : ''}`} />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">
                {['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type) ? 'Güncel Çalışma Saati' : 'Güncel Kilometre'}
              </p>
              <p className="text-xl font-bold">
                {vehicle.currentKm?.toLocaleString() || '-'} {['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type) ? 'SAAT' : 'KM'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Aylık Ort. Yakıt Tüketimi</p>
              <p className="text-xl font-bold">{averageFuelConsumption.toFixed(2)} LT</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Aylık Ort. Gider</p>
              <p className="text-xl font-bold">{averageFuelCost.toFixed(2)} TL</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">
                {['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type) ? 'Yakıt / Saat' : 'Yakıt / 100 KM'}
              </p>
              <p className="text-xl font-bold">
                {['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type)
                  ? averageFuelConsumption.toFixed(2)
                  : (averageFuelConsumption / 100).toFixed(2)} LT
              </p>
            </div>
          </div>
          {showAllInfo && renderVehicleInfo()}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Vize Durumu</h3>
              <p className="text-sm text-gray-500">Son Geçerlilik: {formatDate(vehicle.visaValidUntil)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{visaDaysLeft} Gün</p>
              <p className="text-sm text-gray-500">Kalan Süre</p>
            </div>
          </div>
          <Progress value={visaProgress} className="h-2" />
          {visaDaysLeft <= 30 && (
            <div className="mt-4 flex items-center text-yellow-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">Vize yenileme zamanı yaklaşıyor!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update the Tabs component */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full mt-16">
        <TabsList className="grid w-full grid-cols-5 p-1 bg-muted rounded-xl">
          {[
            { title: 'YAKIT KAYITLARI', value: 'fuel', icon: <Fuel className="w-4 h-4" /> },
            { title: 'SERVİS KAYITLARI', value: 'service', icon: <Settings className="w-4 h-4" /> },
            { title: 'VİZE MUAYENE KAYITLARI', value: 'visa', icon: <FileCheck className="w-4 h-4" /> },
            { title: ['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type) ? 'SAAT KAYITLARI' : 'KM KAYITLARI', value: 'km', icon: <BarChart className="w-4 h-4" /> },
            { title: 'LASTİK KAYITLARI', value: 'tire', icon: <CircleDotIcon className="w-4 h-4" /> },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {tab.icon}
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="fuel" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Yakıt Kayıtları</CardTitle>
              <Button variant="outline" onClick={() => exportToExcel(fuelRecords, 'yakit_kayitlari')}>
                <Download className="mr-2 h-4 w-4" />
                Excel'e Aktar
              </Button>
            </CardHeader>
            <CardContent>
              {sortedFuelRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                          Tarih {sortConfig?.key === 'date' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('receipt_no')}>
                          Matbu Fiş/Fatura
                          No {sortConfig?.key === 'receipt_no' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('station')}>
                          İstasyon/Depo {sortConfig?.key === 'station' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                          Miktar (Lt) {sortConfig?.key === 'amount' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('unit_price')}>
                          Birim Fiyat (TL) {sortConfig?.key === 'unit_price' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('total')}>
                          Toplam (TL) {sortConfig?.key === 'total' && <ArrowUpDown className="inline ml-2 h-4 w-4" />}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginateRecords(sortedFuelRecords).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(new Date(record.date), 'dd.MM.yyyy')}</TableCell>
                          <TableCell>{record.receipt_no || '-'}</TableCell>
                          <TableCell>
                            {record.station_type === 'internal'
                              ? fuelTanks.find(t => t.id === record.tank_id)?.name || '-'
                              : (() => {
                                  const stationId = typeof record.station === 'number' 
                                    ? record.station.toString() 
                                    : record.station;
                                  
                                  const stationObj = stations.find(s => s.id.toString() === stationId);
                                  return stationObj ? stationObj.value : (record.station || '-');
                                })()}
                          </TableCell>
                          <TableCell>{record.amount.toFixed(2)}</TableCell>
                          <TableCell>{record.unit_price.toFixed(2)}</TableCell>
                          <TableCell>{record.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">Henüz yakıt kaydı bulunmamaktadır.</p>
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <span>Sayfa {currentPage}</span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * 7 >= sortedFuelRecords.length}
                >
                  Sonraki
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="service" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Servis Kayıtları</CardTitle>
              <Button variant="outline" onClick={() => exportToExcel(serviceRecords, 'servis_kayitlari')}>
                <Download className="mr-2 h-4 w-4" />
                Excel'e Aktar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Servis Türü</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Maliyet (TL)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginateRecords(serviceRecords).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.title}</TableCell>
                      <TableCell>{record.description}</TableCell>
                      <TableCell>{record.cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <span>Sayfa {currentPage}</span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * 7 >= serviceRecords.length}
                >
                  Sonraki
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="visa" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vize/Muayene Kayıtları</CardTitle>
              <Button variant="outline" onClick={() => exportToExcel([
                { işlem: 'Vize', tarih: vehicle.visaValidUntil, geçerlilikSüresi: '1 Yıl', kalanGün: visaDaysLeft },
                { işlem: 'Egzoz Muayenesi', tarih: vehicle.egzozMuayeneTarihi, geçerlilikSüresi: '1 Yıl', kalanGün: calculateDaysLeft(vehicle.egzozMuayeneTarihi) }
              ], 'vize_muayene_kayitlari')}>
                <Download className="mr-2 h-4 w-4" />
                Excel'e Aktar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Geçerlilik Süresi</TableHead>
                    <TableHead>Kalan Gün</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Vize</TableCell>
                    <TableCell>{formatDate(vehicle.visaValidUntil)}</TableCell>
                    <TableCell>1 Yıl</TableCell>
                    <TableCell>{visaDaysLeft}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Egzoz Muayenesi</TableCell>
                    <TableCell>{formatDate(vehicle.egzozMuayeneTarihi)}</TableCell>
                    <TableCell>1 Yıl</TableCell>
                    <TableCell>{calculateDaysLeft(vehicle.egzozMuayeneTarihi)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="km" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type) ? 'Saat Kayıtları' : 'Kilometre Kayıtları'}
              </CardTitle>
              <Button variant="outline" onClick={() => exportToExcel(sortedKmRecords, 'km_kayitlari')}>
                <Download className="mr-2 h-4 w-4" />
                Excel'e Aktar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>
                      {['EKSKAVATÖR', 'BEKO LOADER', 'FORKLİFT', 'TELEHANDLER'].includes(vehicle.type) ? 'Saat' : 'Kilometre'}
                    </TableHead>
                    <TableHead>Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginateRecords(sortedKmRecords).map((record, index) => {
                    const prevRecord = sortedKmRecords[index + 1]
                    const kmDiff = prevRecord ? record.km - prevRecord.km : 0
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{record.km.toLocaleString()}</TableCell>
                        <TableCell>{kmDiff > 0 ? `+${kmDiff.toLocaleString()}` : '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <span>Sayfa {currentPage}</span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * 7 >= sortedKmRecords.length}
                >
                  Sonraki
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tire" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lastik Kayıtları</CardTitle>
              <Button variant="outline" onClick={() => exportToExcel(tireRecords, 'lastik_kayitlari')}>
                <Download className="mr-2 h-4 w-4" />
                Excel'e Aktar
              </Button>
            </CardHeader>
            <CardContent>
              {renderTireInfo()}
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Lastik Konumu</TableHead>
                    <TableHead>Marka/Model</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginateRecords(tireRecords).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.action}</TableCell>
                      <TableCell>{record.position}</TableCell>
                      <TableCell>{record.brand} / {record.model}</TableCell>
                      <TableCell>{record.condition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <span>Sayfa {currentPage}</span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * 7 >= tireRecords.length}
                >
                  Sonraki
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default VehicleDetails
