import express from 'express';
import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Veri doğrulama middleware'i
const validate = (validations: any[]) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

// JWT doğrulama middleware'i
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Kullanıcı kaydı
router.post('/register', validate([
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('username').notEmpty(),
  // Diğer alanlar için de validasyon eklenebilir
]), async (req, res) => {
  const { 
    username, 
    email, 
    password, 
    firstName, 
    lastName, 
    phoneNumber, 
    birthDate, 
    gender, 
    address, 
    city, 
    country, 
    companyName, 
    role 
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          username, 
          email, 
          password: hashedPassword, 
          firstName, 
          lastName, 
          phoneNumber, 
          birthDate, 
          gender, 
          address, 
          city, 
          country, 
          companyName, 
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu', userId: data[0].id });
  } catch (error: any) {
    console.error('Kayıt hatası:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
    } else {
      res.status(500).json({ error: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
  }
});

// Kullanıcı girişi
router.post('/login', validate([
  body('username').notEmpty(),
  body('password').notEmpty(),
]), async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Giriş yapılırken bir hata oluştu.' });
  }
});

// Şifre sıfırlama isteği
router.post('/forgot-password', validate([
  body('email').isEmail().normalizeEmail(),
]), async (req, res) => {
  const { email } = req.body;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;

    res.json({ message: 'Şifre sıfırlama talimatları e-posta adresinize gönderildi.' });
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    res.status(500).json({ error: 'Şifre sıfırlama isteği işlenirken bir hata oluştu.' });
  }
});

// Kullanıcı bilgilerini güncelleme
router.put('/update-profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const updateData = req.body;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select();

    if (error) throw error;
    res.json({ message: 'Kullanıcı bilgileri başarıyla güncellendi', user: data[0] });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri güncellenirken bir hata oluştu.' });
  }
});

export default router;