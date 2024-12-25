'use client'

import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { useToast } from "../components/ui/use-toast"
import { Separator } from "../components/ui/separator"
import { LockIcon, UserPlusIcon, Mail, Key, Loader2 } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "../components/ui/alert"
import { setAuth, setUser } from '../store/authSlice'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const dispatch = useDispatch()

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        dispatch(setAuth(true))
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email!,
        }))
        navigate('/')
      }
    }
    checkSession()
  }, [navigate, dispatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      dispatch(setAuth(true))
      dispatch(setUser({
        id: data.user!.id,
        email: data.user!.email!,
      }))

      toast({
        title: "Giriş başarılı",
        description: "Ana sayfaya yönlendiriliyorsunuz.",
      })

      navigate('/')

    } catch (error: any) {
      console.error('Giriş hatası:', error)
      setError(error.error_description || error.message || "Giriş sırasında bir hata oluştu.")
      toast({
        title: "Giriş başarısız",
        description: error.error_description || error.message || "E-posta veya şifre hatalı.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Giriş Yap</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                E-posta
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                placeholder="ornek@email.com"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                <Key className="w-4 h-4 mr-2" />
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="rememberMe" className="text-sm">Beni Hatırla</Label>
              </div>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Şifremi Unuttum
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  Giriş Yap
                  <LockIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <div className="mt-6">
            <Separator />
            <p className="text-center text-sm text-gray-600 mt-4">Henüz hesabınız yok mu?</p>
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => navigate('/register')}
            >
              Yeni Hesap Oluştur
              <UserPlusIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-gray-600 text-center">
            Giriş yaparak, <Link to="/terms" className="text-blue-600 hover:underline">Kullanım Şartları</Link> ve{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline">Gizlilik Politikası</Link>'nı kabul etmiş olursunuz.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Login