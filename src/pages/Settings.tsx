'use client'

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from "@/components/ui/progress"
import { Loader2, Plus, Trash2, Settings as SettingsIcon, MapPin, Car, Store, Download, Upload, X, ArrowUpDown } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Setting {
  id: number
  type: string
  value: string
  created_at: string
  updated_at: string
  user_id: string
}

const ITEMS_PER_PAGE = 21

export default function Settings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [settings, setSettings] = useState<Setting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newSetting, setNewSetting] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importedSettingsCount, setImportedSettingsCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUserSession()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchSettings()
      
      const subscription = supabase
        .channel('settings_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${userId}` }, fetchSettings)
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [userId])

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

  const fetchSettings = async () => {
    if (!userId) return
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true })

      if (error) throw error

      setSettings(data || [])
    } catch (error) {
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu.",
        variant: "destructive",
      })
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addSetting = async (type: string) => {
    if (!userId) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      return
    }
    if (!newSetting.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen bir değer girin.",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .insert([{ type, value: newSetting.trim(), user_id: userId }])
        .select()

      if (error) throw error

      setSettings(prevSettings => [...prevSettings, data[0]])
      setNewSetting('')
      toast({
        title: "Başarılı",
        description: "Yeni kayıt başarıyla eklendi.",
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kayıt eklenirken bir hata oluştu.",
        variant: "destructive",
      })
      console.error('Error adding setting:', error)
    }
  }

  const removeSetting = async (id: number) => {
    if (!userId) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      return
    }
    try {
      const { error } = await supabase
        .from('settings')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      setSettings(prevSettings => prevSettings.filter(setting => setting.id !== id))
      toast({
        title: "Başarılı",
        description: "Kayıt başarıyla silindi.",
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kayıt silinirken bir hata oluştu.",
        variant: "destructive",
      })
      console.error('Error removing setting:', error)
    }
  }

  const exportToExcel = (type: string) => {
    const filteredSettings = settings.filter(setting => setting.type === type)
    const ws = XLSX.utils.json_to_sheet(filteredSettings)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type)
    XLSX.writeFile(wb, `${type}_settings.xlsx`)
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (!userId) {
      toast({
        title: "Hata",
        description: "Kullanıcı oturumu bulunamadı.",
        variant: "destructive",
      })
      return
    }
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
          
          const importedSettings = data.map((setting: any, index: number) => {
            setImportProgress((index + 1) / data.length * 100)
            setImportedSettingsCount(index + 1)

            return {
              type,
              value: setting['Değer'] || '',
              user_id: userId
            }
          })

          const { data: insertedData, error } = await supabase
            .from('settings')
            .insert(importedSettings)
            .select()

          if (error) throw error

          setSettings(prevSettings => [...prevSettings, ...(insertedData || [])])
          toast({
            title: "Başarılı",
            description: `${importedSettings.length} kayıt başarıyla içe aktarıldı.`,
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
        setImportedSettingsCount(0)
      }
      reader.readAsBinaryString(file)
    }
  }

  const handleTemplateDownload = (type: string) => {
    const template = [
      { 'Değer': 'Örnek Değer 1' },
      { 'Değer': 'Örnek Değer 2' },
      { 'Değer': 'Örnek Değer 3' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Şablon")
    XLSX.writeFile(wb, `${type}_sablonu.xlsx`)
  }

  const SettingsList = ({ type, title, icon: Icon }: { type: string; title: string; icon: React.ElementType }) => {
    const filteredSettings = settings.filter(setting => setting.type === type)
    const pageCount = Math.ceil(filteredSettings.length / ITEMS_PER_PAGE)
    const paginatedSettings = filteredSettings.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Yeni ${title.toLowerCase()} ekle...`}
              value={newSetting}
              onChange={(e) => setNewSetting(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => addSetting(type)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Ekle
          </Button>
          <Button onClick={() => exportToExcel(type)} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Dışa Aktar
          </Button>
          <Button onClick={() => setIsImportDialogOpen(true)} size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            İçe Aktar
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedSettings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between rounded-lg border p-2 bg-background hover:bg-accent transition-colors"
            >
              <span className="font-medium truncate">{setting.value}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSetting(setting.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {pageCount > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{title} İçeri Aktar</DialogTitle>
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
                <li>{title} bilgilerini şablona aktarın.</li>
                <li>Doldurulan şablonu yükleyin.</li>
              </ol>
              {importProgress > 0 && (
                <div className="w-full space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-center">{importedSettingsCount} kayıt işlendi</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                <X className="mr-2 h-4 w-4" />
                Vazgeç
              </Button>
              <div className="space-x-2">
                <Button onClick={() => handleTemplateDownload(type)}>
                  <Download className="mr-2 h-4 w-4" />
                  Şablonu İndir
                </Button>
                <Button onClick={() => document.getElementById(`file-upload-${type}`)?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Dosya Yükle
                </Button>
              </div>
              <input
                id={`file-upload-${type}`}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => handleExcelImport(e, type)}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!userId) {
    return <div>Lütfen giriş yapın.</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Sistem Ayarları</h1>
        </div>
        <Card className="w-full">
          <CardContent className="p-6">
            <Tabs defaultValue="stations" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="stations" className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>İstasyonlar</span>
                </TabsTrigger>
                <TabsTrigger value="brands" className="flex items-center space-x-2">
                  <Car className="w-4 h-4" />
                  <span>Araç Markaları</span>
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="flex items-center space-x-2">
                  <Store className="w-4 h-4" />
                  <span>Akaryakıt Tedarikçileri</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stations">
                <SettingsList type="stations" title="İstasyon" icon={MapPin} />
              </TabsContent>

              <TabsContent value="brands">
                <SettingsList type="brands" title="Araç Markası" icon={Car} />
              </TabsContent>

              <TabsContent value="suppliers">
                <SettingsList type="suppliers" title="Akaryakıt Tedarikçisi" icon={Store} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}