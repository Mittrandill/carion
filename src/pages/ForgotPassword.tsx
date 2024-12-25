import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useToast } from "../components/ui/use-toast";
import { ArrowLeftIcon } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Şifre sıfırlama bağlantısı gönderildi",
        description: "Lütfen e-posta kutunuzu kontrol edin.",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Hata",
        description: "Şifre sıfırlama işlemi başarısız oldu.",
        variant: "destructive",
      });
      console.error('Error resetting password:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Şifremi Unuttum</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full">
              Şifre Sıfırlama Bağlantısı Gönder
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" className="mt-4" onClick={() => navigate('/login')}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Giriş Sayfasına Dön
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;