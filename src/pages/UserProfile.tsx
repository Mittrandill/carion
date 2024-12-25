'use client'

import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateUserProfile, AppDispatch } from '../store/authSlice'

interface UserProfile {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone_number: string | null
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | null
  address: string
  city: string
  country: string
  company_name: string
  role: string
  avatar_url: string
}

export default function UserProfile() {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: any) => state.auth.user)
  const { toast } = useToast()

  const [profileData, setProfileData] = useState<UserProfile>({
    id: '',
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: null,
    birth_date: null,
    gender: null,
    address: '',
    city: '',
    country: '',
    company_name: '',
    role: '',
    avatar_url: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          first_name,
          last_name,
          phone_number,
          birth_date,
          gender,
          address,
          city,
          country,
          company_name,
          role,
          avatar_url
        `)
        .eq('id', user.id)
        .single()

      if (error) {
        throw error
      }

      // Verileri doğru şekilde dönüştür
      const sanitizedData: UserProfile = {
        id: profileData.id,
        username: profileData.username || '',
        email: profileData.email || '',
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        phone_number: profileData.phone_number || null,
        birth_date: profileData.birth_date || null,
        gender: profileData.gender as 'male' | 'female' | 'other' | null,
        address: profileData.address || '',
        city: profileData.city || '',
        country: profileData.country || '',
        company_name: profileData.company_name || '',
        role: profileData.role || '',
        avatar_url: profileData.avatar_url || ''
      }

      setProfileData(sanitizedData)
      
    } catch (error) {
      console.error('Error fetching user profile:', error)
      toast({
        title: "Hata",
        description: "Kullanıcı profili yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: name === 'phone_number' || name === 'birth_date' ? (value || null) : value
    }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setProfileData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsLoading(true)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`
  
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file)
  
        if (uploadError) throw uploadError
  
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
  
        const publicUrl = data.publicUrl
  
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)
  
        if (updateError) throw updateError
  
        setProfileData(prev => ({ ...prev, avatar_url: publicUrl }))
        toast({
          title: "Başarılı",
          description: "Profil resmi güncellendi.",
        })
      } catch (error) {
        console.error('Error uploading avatar:', error)
        toast({
          title: "Hata",
          description: "Profil resmi yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)

      if (error) throw error

      dispatch(updateUserProfile(profileData))

      toast({
        title: "Profil güncellendi",
        description: "Profil bilgileriniz başarıyla güncellendi.",
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Hata",
        description: "Profil güncellenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Hata",
        description: "Yeni şifreler eşleşmiyor.",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwordData.newPassword 
      })

      if (error) throw error

      toast({
        title: "Şifre değiştirildi",
        description: "Şifreniz başarıyla güncellendi.",
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: "Hata",
        description: "Şifre değiştirilirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div>Yükleniyor...</div>
  }

  return (
    <div className="p-8 pr-8 pt-4 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Profili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
          <Avatar className="h-20 w-20">
  <AvatarImage 
    src={profileData.avatar_url || ''} 
    alt={profileData.username}
    className="object-cover"
  />
  <AvatarFallback>
    {profileData.first_name ? profileData.first_name[0].toUpperCase() : 'A'}
  </AvatarFallback>
</Avatar>
            <div>
              <h2 className="text-2xl font-bold">{`${profileData.first_name} ${profileData.last_name}`}</h2>
              <p className="text-gray-500">{profileData.company_name}</p>
            </div>
          </div>
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
              <TabsTrigger value="password">Şifre Değiştir</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Kullanıcı Adı</Label>
                    <Input
                      id="username"
                      name="username"
                      value={profileData.username}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Ad</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Soyad</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Telefon Numarası</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={profileData.phone_number || ''}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Doğum Tarihi</Label>
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      value={profileData.birth_date || ''}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Cinsiyet</Label>
                    <Select 
                      onValueChange={handleSelectChange('gender')} 
                      defaultValue={profileData.gender || undefined}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Cinsiyet seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkek</SelectItem>
                        <SelectItem value="female">Kadın</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adres</Label>
                    <Input
                      id="address"
                      name="address"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Şehir</Label>
                    <Input
                      id="city"
                      name="city"
                      value={profileData.city}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Ülke</Label>
                    <Input
                      id="country"
                      name="country"
                      value={profileData.country}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Firma Adı</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      value={profileData.company_name}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Input
                      id="role"
                      name="role"
                      value={profileData.role}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Profil Resmi</Label>
                    <Input
                      id="avatar"
                      name="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex justify-end space-x-2">
                
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>İptal</Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>Düzenle</Button>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="password">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Yeni Şifre</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}