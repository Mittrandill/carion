import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from "@/components/ui/use-toast";
import { Car, Fuel, CalendarIcon, Hash, Palette, Building2, FileCheck, Truck, Cog, FileText, CreditCard, Plus, Check, Loader2 } from 'lucide-react';

const vehicleTypes = ['OTOMOBİL', 'OTOBÜS', 'MİNİBÜS', 'PANELVAN', 'SUV', 'KAMYONET', 'KAMYON', 'TRAKTÖR', 'FORKLİFT', 'BEKO LOADER', 'EKSKAVATÖR', 'TELEHANDLER'];
const fuelTypes = ['BENZİN', 'DİZEL', 'LPG', 'ELEKTRİK', 'HİBRİT'];
const tireConditions = ['İYİ', 'ORTA', 'KÖTÜ'];

interface Tire {
  position: string;
  brand: string;
  type: string;
  pattern: string;
  size: string;
  condition: string;
  serialNumber: string;
  dotNumber: string;
  currentKm: number;
  estimatedLifetime: number;
}

const steps = [
  { title: "Temel Bilgiler", description: "Araç temel bilgilerini girin" },
  { title: "Lastik Bilgileri", description: "Lastik detaylarını girin" },
  { title: "Ruhsat Bilgileri", description: "Ruhsat bilgilerini girin" },
  { title: "Diğer Bilgiler", description: "Ek detayları girin" }
];

function AddEditVehicle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    plate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    visaValidUntil: '',
    status: 'ÖZMAL',
    type: '',
    isVehicleSubjectToVisa: true,
    fuelType: '',
    color: '',
    currentKm: 0,
    ticariad: '',
    egzozMuayeneTarihi: '',
    trafigeGikisTarihi: '',
    user_id: '',
    axleCount: 2,
    lastAxleSingleTire: false,
    tires: [] as Tire[],
    chassisNumber: '',
    engineSerialNumber: '',
    engineVolume: '',
    enginePower: '',
    registrationOwnerIdNumber: '',
    registrationOwnerName: '',
    documentSerialNumber: '',
    issuedCity: '',
    issuedDistrict: '',
    registrationDate: '',
    registrationOrderNumber: '',
    vehicleClass: '',
    netWeight: '',
    maxLoadWeight: '',
    trailerMaxLoadWeight: '',
    seatCount: '',
    hgsOgsInfo: '',
    hgsOgsPurchaseLocation: '',
    hgsOgsRegistrationDate: '',
    isSubjectToMtv: false,
    mtvJulyPaymentStatus: false,
    mtvDecemberPaymentStatus: false,
  });

  const [suggestedMakes, setSuggestedMakes] = React.useState<string[]>([]);
  const [isNewBrand, setIsNewBrand] = React.useState(false);
  const makeInputRef = React.useRef<HTMLInputElement>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(false);
  const suggestionsRef = React.useRef<HTMLUListElement>(null);
  const [isEditMode, setIsEditMode] = React.useState(!!id);

  React.useEffect(() => {
    fetchUserSession();
  }, []);

  React.useEffect(() => {
    if (userId && id) {
      fetchVehicle(parseInt(id));
      setIsEditMode(true);
    }
  }, [userId, id]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDateChange = (name: string, value: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (value === '' || dateRegex.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const fetchUserSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error fetching user session:', error);
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu alınamadı.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    if (session?.user) {
      setUserId(session.user.id);
      setFormData(prev => ({ ...prev, user_id: session.user.id }));
    } else {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      navigate('/login');
    }
  };

  const fetchVehicle = async (vehicleId: number) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching vehicle:', error);
      toast({
        title: "Hata",
        description: "Araç bilgileri alınamadı.",
        variant: "destructive",
      });
      navigate('/vehicles');
    } else if (data) {
      const formattedData = {
        ...data,
        visaValidUntil: data.visaValidUntil ? data.visaValidUntil.split('T')[0] : '',
        egzozMuayeneTarihi: data.egzozMuayeneTarihi ? data.egzozMuayeneTarihi.split('T')[0] : '',
        trafigeGikisTarihi: data.trafigeGikisTarihi ? data.trafigeGikisTarihi.split('T')[0] : '',
        hgsOgsRegistrationDate: data.hgsOgsRegistrationDate ? data.hgsOgsRegistrationDate.split('T')[0] : '',
        registrationDate: data.registrationDate ? data.registrationDate.split('T')[0] : '',
        tires: Array.isArray(data.tires) ? data.tires : [],
      };

      setFormData(formattedData);
    }
  };

  const handleChange = async (name: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'make') {
      fetchSuggestedMakes(value as string);
      setIsSuggestionsOpen(true);
    }

    if (name === 'axleCount' || name === 'lastAxleSingleTire') {
      const newTires = generateTirePositions(
        name === 'axleCount' ? value as number : formData.axleCount,
        name === 'lastAxleSingleTire' ? value as boolean : formData.lastAxleSingleTire
      );
      setFormData(prev => ({ ...prev, tires: newTires }));
    }
  };

  const generateTirePositions = (axleCount: number, lastAxleSingleTire: boolean): Tire[] => {
    const positions: Tire[] = [];

    positions.push(createTire("1. Aks - Sol"));
    positions.push(createTire("1. Aks - Sağ"));

    for (let aks = 2; aks <= axleCount; aks++) {
      if (aks === axleCount && lastAxleSingleTire) {
        positions.push(createTire(`${aks}. Aks - Sol`));
        positions.push(createTire(`${aks}. Aks - Sağ`));
      } else {
        positions.push(createTire(`${aks}. Aks - Sol İç`));
        positions.push(createTire(`${aks}. Aks - Sol Dış`));
        positions.push(createTire(`${aks}. Aks - Sağ İç`));
        positions.push(createTire(`${aks}. Aks - Sağ Dış`));
      }
    }

    return positions;
  };

  const createTire = (position: string): Tire => ({
    position,
    brand: '',
    type: '',
    pattern: '',
    size: '',
    condition: '',
    serialNumber: '',
    dotNumber: '',
    currentKm: 0,
    estimatedLifetime: 0
  });

  const fetchSuggestedMakes = React.useCallback(async (value: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('type', 'brands')
      .eq('user_id', userId)
      .ilike('value', `%${value}%`);

    if (error) {
      console.error('Error fetching suggested makes:', error);
    } else {
      const uniqueMakes = [...new Set(data.map(item => item.value))];
      setSuggestedMakes(uniqueMakes);
      setIsNewBrand(uniqueMakes.length === 0);
    }
  }, [userId]);

  const addNewBrand = async () => {
    if (!userId || !formData.make.trim()) {
      toast({
        title: "Hata",
        description: "Marka adı boş olamaz veya kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('settings')
        .insert([{ type: 'brands', value: formData.make.trim(), user_id: userId }])
        .select();

      if (error) throw error;

      toast({
        title: "Yeni marka eklendi",
        description: `${formData.make} markası başarıyla eklendi.`,
      });

      setSuggestedMakes([]);
      setIsNewBrand(false);
      setIsSuggestionsOpen(false);
    } catch (error) {
      console.error('Error adding new brand:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yeni marka eklenirken bir hata oluştu.",
      });
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    if (name === 'isSubjectToMtv') {
      setFormData(prev => ({ ...prev, [name]: value === 'var' }));
    } else if (name === 'mtvJulyPaymentStatus' || name === 'mtvDecemberPaymentStatus') {
      setFormData(prev => ({ ...prev, [name]: value === 'paid' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTireChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => {
      const newTires = [...prev.tires];
      newTires[index] = { ...newTires[index], [field]: value };
      return { ...prev, tires: newTires };
    });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep(prev => Math.min(prev + 1, steps.length));
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < steps.length) {
      handleNext(e);
      return;
    }
    setIsLoading(true);

    if (!userId) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (isNewBrand) {
      await addNewBrand();
    }

    try {
      const formattedData = {
        ...formData,
        visaValidUntil: formData.visaValidUntil || null,
        egzozMuayeneTarihi: formData.egzozMuayeneTarihi || null,
        trafigeGikisTarihi: formData.trafigeGikisTarihi || null,
        hgsOgsRegistrationDate: formData.hgsOgsRegistrationDate || null,
        registrationDate: formData.registrationDate || null,
        user_id: userId,
      };

      let savedVehicle;
      if (id) {
        const { id: _, ...dataToUpdate } = formattedData;
        const { data, error } = await supabase
          .from('vehicles')
          .update(dataToUpdate)
          .eq('id', parseInt(id))
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        savedVehicle = data;
      } else {
        const { data, error } = await supabase
          .from('vehicles')
          .insert([formattedData]).select()
          .single();

        if (error) {
          if (error.code === '23505' && error.message.includes('vehicles_plate_key')) {
            toast({
              variant: "destructive",
              title: "Hata",
              description: "Bu plaka numarası zaten kullanımda. Lütfen farklı bir plaka numarası girin.",
            });
            setIsLoading(false);
            return;
          }
          throw error;
        }
        savedVehicle = data;
      }

      if (savedVehicle) {
        // Save tires and create tasks for tire replacement notifications
        for (const tire of formData.tires) {
          const { data: tireData, error: tireError } = await supabase
            .from('tires')
            .insert({
              vehicle_id: savedVehicle.id,
              ...tire
            })
            .select()
            .single();

          if (tireError) throw tireError;

          // Calculate the km when the tire should be replaced
          const replacementKm = tire.currentKm + tire.estimatedLifetime;

          // Create a task for tire replacement notification
          await supabase.from('tasks').insert({
            title: 'Lastik Değişimi',
            description: `${savedVehicle.plate} plakalı aracın ${tire.position} lastiği için değişim zamanı yaklaşıyor`,
            date: null,
            tag: 'lastik',
            vehicleId: savedVehicle.id,
            status: 'ongoing',
            user_id: userId,
            km_threshold: replacementKm - 1000
          });
        }
      }

      if (savedVehicle.isVehicleSubjectToVisa) {
        if (savedVehicle.visaValidUntil) {
          const { data: existingVisaTask, error: visaTaskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('vehicleid', savedVehicle.id)
            .eq('tag', 'vize')
            .eq('completed', false)
            .single();

          if (visaTaskError && visaTaskError.code !== 'PGRST116') {
            throw visaTaskError;
          }

          if (existingVisaTask) {
            const { error: updateVisaError } = await supabase
              .from('tasks')
              .update({
                date: savedVehicle.visaValidUntil,
                description: `${savedVehicle.plate} plakalı araç için vize yenileme`,
              })
              .eq('id', existingVisaTask.id);

            if (updateVisaError) throw updateVisaError;
          } else {
            const { error: newVisaError } = await supabase
              .from('tasks')
              .insert({
                title: 'Vize Yenileme',
                description: `${savedVehicle.plate} plakalı araç için vize yenileme`,
                date: savedVehicle.visaValidUntil,
                tag: 'vize',
                vehicleid: savedVehicle.id,
                completed: false,
                user_id: userId
              });

            if (newVisaError) throw newVisaError;
          }
        }

        if (savedVehicle.egzozMuayeneTarihi) {
          const { data: existingEgzozTask, error: egzozTaskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('vehicleid', savedVehicle.id)
            .eq('tag', 'egzoz')
            .eq('completed', false)
            .single();

          if (egzozTaskError && egzozTaskError.code !== 'PGRST116') {
            throw egzozTaskError;
          }

          if (existingEgzozTask) {
            const { error: updateEgzozError } = await supabase
              .from('tasks')
              .update({
                date: savedVehicle.egzozMuayeneTarihi,
                description: `${savedVehicle.plate} plakalı araç için egzoz emisyon ölçümü`,
              })
              .eq('id', existingEgzozTask.id);

            if (updateEgzozError) throw updateEgzozError;
          } else {
            const { error: newEgzozError } = await supabase
              .from('tasks')
              .insert({
                title: 'Egzoz Emisyon Ölçümü',
                description: `${savedVehicle.plate} plakalı araç için egzoz emisyon ölçümü`,
                date: savedVehicle.egzozMuayeneTarihi,
                tag: 'egzoz',
                vehicleid: savedVehicle.id,
                completed: false,
                user_id: userId
              });

            if (newEgzozError) throw newEgzozError;
          }
        }
      }

      toast({
        title: "Başarılı",
        description: id ? "Araç başarıyla güncellendi." : "Araç başarıyla eklendi.",
      });
      navigate('/vehicles');
    } catch (error) {
      console.error('Failed to save vehicle or create tasks:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: id ? "Araç güncellenemedi veya görevler oluşturulamadı. Lütfen tekrar deneyin." : "Araç eklenemedi veya görevler oluşturulamadı. Lütfen tekrar deneyin.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="plate" className="flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>Plaka</span>
          </Label>
          <Input
            id="plate"
            name="plate"
            value={formData.plate}
            onChange={(e) => handleChange('plate', e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div className="space-y-2 relative" ref={makeInputRef}>
          <Label htmlFor="make" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Marka</span>
          </Label>
          <div className="flex items-center space-x-2">
            <Input
              id="make"
              name="make"
              value={formData.make}
              onChange={(e) => handleChange('make', e.target.value)}
              required
              className="w-full"
            />
            {isNewBrand && (
              <Button type="button" onClick={addNewBrand} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ekle
              </Button>
            )}
          </div>
          {isSuggestionsOpen && suggestedMakes.length > 0 && (
            <ul ref={suggestionsRef} className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestedMakes.map((suggestion) => (
                <li
                  key={suggestion}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    handleChange('make', suggestion);
                    setIsSuggestionsOpen(false);
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="model" className="flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>Model</span>
          </Label>
          <Input
            id="model"
            name="model"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year" className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Yıl</span>
          </Label>
          <Input
            id="year"
            name="year"
            type="number"
            value={formData.year}
            onChange={(e) => handleChange('year', parseInt(e.target.value))}
            required
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type" className="flex items-center space-x-2">
            <Truck className="w-4 h-4" />
            <span>Araç Tipi</span>
          </Label>
          <Select onValueChange={handleSelectChange('type')} value={formData.type}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Araç Tipi Seçin" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuelType" className="flex items-center space-x-2">
            <Fuel className="w-4 h-4" />
            <span>Yakıt Türü</span>
          </Label>
          <Select onValueChange={handleSelectChange('fuelType')} value={formData.fuelType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Yakıt Türü Seçin" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.map(fuelType => (
                <SelectItem key={fuelType} value={fuelType}>{fuelType}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentKm" className="flex items-center space-x-2">
            <Hash className="w-4 h-4" />
            <span>Mevcut KM</span>
          </Label>
          <Input
            id="currentKm"
            name="currentKm"
            type="number"
            value={formData.currentKm}
            onChange={(e) => handleChange('currentKm', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Renk</span>
          </Label>
          <Input
            id="color"
            name="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticariad" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Ticari Adı</span>
          </Label>
          <Input
            id="ticariad"
            name="ticariad"
            value={formData.ticariad}
            onChange={(e) => handleChange('ticariad', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trafigeGikisTarihi" className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Trafiğe Çıkış Tarihi</span>
          </Label>
          <Input
            type="date"
            id="trafigeGikisTarihi"
            value={formData.trafigeGikisTarihi}
            onChange={(e) => handleDateChange('trafigeGikisTarihi', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-lg font-semibold">Araç Vizeye Tabi Mi?</Label>
        <RadioGroup
          value={formData.isVehicleSubjectToVisa ? 'yes' : 'no'}
          onValueChange={(value) => {
            const isSubjectToVisa = value === 'yes';
            setFormData(prev => ({
              ...prev,
              isVehicleSubjectToVisa: isSubjectToVisa,
              visaValidUntil: isSubjectToVisa ? prev.visaValidUntil : '',
              egzozMuayeneTarihi: isSubjectToVisa ? prev.egzozMuayeneTarihi : ''
            }));
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-start space-x-2 border rounded-md p-4">
            <RadioGroupItem value="yes" id="visa-yes" className="mt-1" />
            <div>
              <Label htmlFor="visa-yes" className="font-medium">Evet Vizeye Tabi</Label>
              <p className="text-sm text-gray-500">Vizeye Tabi Araçların Vize Takibi Yapılır. Vize Zamanı Yaklaştığında Size Uyarı Verir.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 border rounded-md p-4">
            <RadioGroupItem value="no" id="visa-no" className="mt-1" />
            <div>
              <Label htmlFor="visa-no" className="font-medium">Hayır Vizeye Tabi Değil</Label>
              <p className="text-sm text-gray-500">Vizeye Tabi Olmayan Araçların Vize Takibi Yapılmaz.</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {formData.isVehicleSubjectToVisa && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="visaValidUntil" className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4" />
              <span>Vize Geçerlilik Tarihi</span>
            </Label>
            <Input
              type="date"
              id="visaValidUntil"
              value={formData.visaValidUntil}
              onChange={(e) => handleDateChange('visaValidUntil', e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="egzozMuayeneTarihi" className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4" />
              <span>Egzoz Muayene Tarihi</span>
            </Label>
            <Input
              type="date"
              id="egzozMuayeneTarihi"
              value={formData.egzozMuayeneTarihi}
              onChange={(e) => handleDateChange('egzozMuayeneTarihi', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status" className="flex items-center space-x-2">
          <FileCheck className="w-4 h-4" />
          <span>Sahiplik</span>
        </Label>
        <Select onValueChange={handleSelectChange('status')} value={formData.status}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Araç size mi ait kiralık mı?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ÖZMAL">ÖZMAL</SelectItem>
            <SelectItem value="KİRALIK">KİRALIK</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="axleCount" className="flex items-center space-x-2">
          <Truck className="w-4 h-4" />
          <span>Aks Sayısı</span>
        </Label>
        <Input
          id="axleCount"
          name="axleCount"
          type="number"
          value={formData.axleCount}
          onChange={(e) => handleChange('axleCount', parseInt(e.target.value))}
          min={1}
          max={10}
          required
        />
      </div>
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Son Aks Lastik Durumu</Label>
        <RadioGroup
          value={formData.lastAxleSingleTire ? 'var' : 'yok'}
          onValueChange={(value) => handleChange('lastAxleSingleTire', value === 'var')}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-start space-x-2 border rounded-md p-4">
            <RadioGroupItem value="var" id="lastAxle-var" className="mt-1" />
            <div>
              <Label htmlFor="lastAxle-var" className="font-medium">Tek Lastik</Label>
              <p className="text-sm text-gray-500">Son aksta tek lastiğiniz varsa lastik sayınız tek lastiğe göre otomatik oluşacaktır.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 border rounded-md p-4">
            <RadioGroupItem value="yok" id="lastAxle-yok" className="mt-1" />
            <div>
              <Label htmlFor="lastAxle-yok" className="font-medium">Çift Lastik</Label>
              <p className="text-sm text-gray-500">Son aksta çift lastiğiniz varsa lastik sayınız çift lastiğe göre otomatik oluşacaktır.</p>
            </div>
          </div>
        </RadioGroup>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.isArray(formData.tires) && formData.tires.map((tire, index) => (
          <Card key={index} className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{tire.position}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`tire-brand-${index}`}>Marka</Label>
                  <Input
                    id={`tire-brand-${index}`}
                    value={tire.brand}
                    onChange={(e) => handleTireChange(index, 'brand', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tire-type-${index}`}>Tip</Label>
                  <Input
                    id={`tire-type-${index}`}
                    value={tire.type}
                    onChange={(e) => handleTireChange(index, 'type', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`tire-pattern-${index}`}>Desen</Label>
                  <Input
                    id={`tire-pattern-${index}`}
                    value={tire.pattern}
                    onChange={(e) => handleTireChange(index, 'pattern', e.target.value)}
                  />
                                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tire-size-${index}`}>Ebat</Label>
                  <Input
                    id={`tire-size-${index}`}
                    value={tire.size}
                    onChange={(e) => handleTireChange(index, 'size', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tire-condition-${index}`}>Durum</Label>
                <Select
                  onValueChange={(value) => handleTireChange(index, 'condition', value)}
                  value={tire.condition}
                >
                  <SelectTrigger id={`tire-condition-${index}`}>
                    <SelectValue placeholder="Lastik Durumu" />
                  </SelectTrigger>
                  <SelectContent>
                    {tireConditions.map(condition => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`tire-serial-${index}`}>Seri No</Label>
                  <Input
                    id={`tire-serial-${index}`}
                    value={tire.serialNumber}
                    onChange={(e) => handleTireChange(index, 'serialNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tire-dot-${index}`}>DOT No</Label>
                  <Input
                    id={`tire-dot-${index}`}
                    value={tire.dotNumber}
                    onChange={(e) => handleTireChange(index, 'dotNumber', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`tire-currentkm-${index}`}>Mevcut KM</Label>
                  <Input
                    id={`tire-current-km-${index}`}
                    type="number"
                    value={tire.currentKm}
                    onChange={(e) => handleTireChange(index, 'currentKm', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`tire-lifetime-${index}`}>Tahmini Kalan Lastik Ömrü (km)</Label>
                  <Input
                    id={`tire-lifetime-${index}`}
                    type="number"
                    value={tire.estimatedLifetime}
                    onChange={(e) => handleTireChange(index, 'estimatedLifetime', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="chassisNumber" className="flex items-center space-x-2">
            <Hash className="w-4 h-4" />
            <span>Şasi Numarası</span>
          </Label>
          <Input
            id="chassisNumber"
            name="chassisNumber"
            value={formData.chassisNumber}
            onChange={(e) => handleChange('chassisNumber', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="engineSerialNumber" className="flex items-center space-x-2">
            <Hash className="w-4 h-4" />
            <span>Motor Seri Numarası</span>
          </Label>
          <Input
            id="engineSerialNumber"
            name="engineSerialNumber"
            value={formData.engineSerialNumber}
            onChange={(e) => handleChange('engineSerialNumber', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="engineVolume" className="flex items-center space-x-2">
            <Cog className="w-4 h-4" />
            <span>Motor Hacmi</span>
          </Label>
          <Input
            id="engineVolume"
            name="engineVolume"
            value={formData.engineVolume}
            onChange={(e) => handleChange('engineVolume', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="enginePower" className="flex items-center space-x-2">
            <Cog className="w-4 h-4" />
            <span>Motor Gücü</span>
          </Label>
          <Input
            id="enginePower"
            name="enginePower"
            value={formData.enginePower}
            onChange={(e) => handleChange('enginePower', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="registrationOwnerIdNumber" className="flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Ruhsat Sahibi TC/VKN</span>
        </Label>
        <Input
          id="registrationOwnerIdNumber"
          name="registrationOwnerIdNumber"
          value={formData.registrationOwnerIdNumber}
          onChange={(e) => handleChange('registrationOwnerIdNumber', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="registrationOwnerName" className="flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Ruhsat Sahibi Adı</span>
        </Label>
        <Input
          id="registrationOwnerName"
          name="registrationOwnerName"
          value={formData.registrationOwnerName}
          onChange={(e) => handleChange('registrationOwnerName', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="documentSerialNumber" className="flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Belge Seri Numarası</span>
        </Label>
        <Input
          id="documentSerialNumber"
          name="documentSerialNumber"
          value={formData.documentSerialNumber}
          onChange={(e) => handleChange('documentSerialNumber', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="issuedCity" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Verildiği İl</span>
          </Label>
          <Input
            id="issuedCity"
            name="issuedCity"
            value={formData.issuedCity}
            onChange={(e) => handleChange('issuedCity', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="issuedDistrict" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Verildiği İlçe</span>
          </Label>
          <Input
            id="issuedDistrict"
            name="issuedDistrict"
            value={formData.issuedDistrict}
            onChange={(e) => handleChange('issuedDistrict', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="registrationDate" className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Tescil Tarihi</span>
          </Label>
          <Input
            type="date"
            id="registrationDate"
            value={formData.registrationDate}
            onChange={(e) => handleDateChange('registrationDate', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registrationOrderNumber" className="flex items-center space-x-2">
            <Hash className="w-4 h-4" />
            <span>Tescil Sıra No</span>
          </Label>
          <Input
            id="registrationOrderNumber"
            name="registrationOrderNumber"
            value={formData.registrationOrderNumber}
            onChange={(e) => handleChange('registrationOrderNumber', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicleClass" className="flex items-center space-x-2">
          <Truck className="w-4 h-4" />
          <span>Araç Sınıfı</span>
        </Label>
        <Input
          id="vehicleClass"
          name="vehicleClass"
          value={formData.vehicleClass}
          onChange={(e) => handleChange('vehicleClass', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="netWeight" className="flex items-center space-x-2">
            <Truck className="w-4 h-4" />
            <span>Net Ağırlık</span>
          </Label>
          <Input
            id="netWeight"
            name="netWeight"
            value={formData.netWeight}
            onChange={(e) => handleChange('netWeight', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxLoadWeight" className="flex items-center space-x-2">
            <Truck className="w-4 h-4" />
            <span>Azami Yüklü Ağırlık</span>
          </Label>
          <Input
            id="maxLoadWeight"
            name="maxLoadWeight"
            value={formData.maxLoadWeight}
            onChange={(e) => handleChange('maxLoadWeight', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trailerMaxLoadWeight" className="flex items-center space-x-2">
            <Truck className="w-4 h-4" />
            <span>Römork Azami Yüklü Ağırlık</span>
          </Label>
          <Input
            id="trailerMaxLoadWeight"
            name="trailerMaxLoadWeight"
            value={formData.trailerMaxLoadWeight}
            onChange={(e) => handleChange('trailerMaxLoadWeight', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="seatCount" className="flex items-center space-x-2">
          <Truck className="w-4 h-4" />
          <span>Koltuk Sayısı</span>
        </Label>
        <Input
          id="seatCount"
          name="seatCount"
          value={formData.seatCount}
          onChange={(e) => handleChange('seatCount', e.target.value)}
          className="w-full"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="hgsOgsInfo" className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4" /><CreditCard className="w-4 h-4" />
          <span>HGS/OGS Bilgisi</span>
        </Label>
        <Input
          id="hgsOgsInfo"
          name="hgsOgsInfo"
          value={formData.hgsOgsInfo}
          onChange={(e) => handleChange('hgsOgsInfo', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hgsOgsPurchaseLocation" className="flex items-center space-x-2">
          <Building2 className="w-4 h-4" />
          <span>HGS/OGS Alım Yeri</span>
        </Label>
        <Input
          id="hgsOgsPurchaseLocation"
          name="hgsOgsPurchaseLocation"
          value={formData.hgsOgsPurchaseLocation}
          onChange={(e) => handleChange('hgsOgsPurchaseLocation', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hgsOgsRegistrationDate" className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4" />
          <span>HGS/OGS Kayıt Tarihi</span>
        </Label>
        <Input
          type="date"
          id="hgsOgsRegistrationDate"
          value={formData.hgsOgsRegistrationDate}
          onChange={(e) => handleDateChange('hgsOgsRegistrationDate', e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-4">
        <Label className="text-lg font-semibold">MTV'ye Tabi Mi?</Label>
        <RadioGroup
          value={formData.isSubjectToMtv ? 'var' : 'yok'}
          onValueChange={handleSelectChange('isSubjectToMtv')}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-start space-x-2 border rounded-md p-4">
            <RadioGroupItem value="var" id="mtv-var" className="mt-1" />
            <div>
              <Label htmlFor="mtv-var" className="font-medium">Var</Label>
              <p className="text-sm text-gray-500">MTV ödemesi yapılması gerekiyor.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 border rounded-md p-4">
            <RadioGroupItem value="yok" id="mtv-yok" className="mt-1" />
            <div>
              <Label htmlFor="mtv-yok" className="font-medium">Yok</Label>
              <p className="text-sm text-gray-500">MTV ödemesi gerekmiyor.</p>
            </div>
          </div>
        </RadioGroup>
      </div>
      {formData.isSubjectToMtv && (
        <>
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Birinci dönem MTV Ödeme Durumu</Label>
            <RadioGroup
              value={formData.mtvJulyPaymentStatus ? 'paid' : 'unpaid'}
              onValueChange={handleSelectChange('mtvJulyPaymentStatus')}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="flex items-start space-x-2 border rounded-md p-4">
                <RadioGroupItem value="paid" id="mtv-july-paid" className="mt-1" />
                <div>
                  <Label htmlFor="mtv-july-paid" className="font-medium">Ödendi</Label>
                  <p className="text-sm text-gray-500">Birinci dönem MTV ödemesi yapıldı.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border rounded-md p-4">
                <RadioGroupItem value="unpaid" id="mtv-july-unpaid" className="mt-1" />
                <div>
                  <Label htmlFor="mtv-july-unpaid" className="font-medium">Ödenmedi</Label>
                  <p className="text-sm text-gray-500">Birinci dönem MTV ödemesi yapılmadı.</p>
                </div>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-4">
            <Label className="text-lg font-semibold">İkinci dönem MTV Ödeme Durumu</Label>
            <RadioGroup
              value={formData.mtvDecemberPaymentStatus ? 'paid' : 'unpaid'}
              onValueChange={handleSelectChange('mtvDecemberPaymentStatus')}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="flex items-start space-x-2 border rounded-md p-4">
                <RadioGroupItem value="paid" id="mtv-december-paid" className="mt-1" />
                <div>
                  <Label htmlFor="mtv-december-paid" className="font-medium">Ödendi</Label>
                  <p className="text-sm text-gray-500">İkinci dönem MTV ödemesi yapıldı.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border rounded-md p-4">
                <RadioGroupItem value="unpaid" id="mtv-december-unpaid" className="mt-1" />
                <div>
                  <Label htmlFor="mtv-december-unpaid" className="font-medium">Ödenmedi</Label>
                  <p className="text-sm text-gray-500">İkinci dönem MTV ödemesi yapılmadı.</p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-8 pr-48 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="flex justify-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{id ? 'Araç Düzenle' : 'Yeni Araç Tanımla'}</CardTitle>
            <CardDescription>Araç bilgilerini giriniz.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-8" role="progressbar" aria-valuenow={(isEditMode ? steps.length : step) / steps.length * 100} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(isEditMode ? steps.length : step) / steps.length * 100}%` }}
                />
              </div>

              {/* Steps */}
              <nav aria-label="Form steps">
                <ol className="flex justify-between mb-8">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                            isEditMode || step > i + 1 ? "bg-primary border-primary" : 
                            step === i + 1 ? "border-primary" : 
                            "border-muted-foreground"
                          )}
                          aria-current={step === i + 1 ? "step" : undefined}
                        >
                          {isEditMode || step > i + 1 ? (
                            <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                          ) : (
                            <span className={cn(
                              "text-sm font-medium",
                              step === i + 1 ? "text-primary" : "text-muted-foreground"
                            )}>
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium mt-2">{s.title}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={cn(
                            "h-[2px] w-24 mx-2",
                            isEditMode || step > i + 1 ? "bg-primary" : "bg-muted"
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </nav>

              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}

              <div className="flex justify-between">
                <Button
                  type="button"
                  onClick={handlePrevious}
                  disabled={step === 1}
                >
                  Önceki
                </Button>
                {step < steps.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                  >
                    Sonraki
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      isEditMode ? 'Güncelle' : 'Kaydet'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AddEditVehicle;

