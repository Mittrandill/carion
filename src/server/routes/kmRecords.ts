import express from 'express';
import { supabase } from '../lib/supabaseClient';

const router = express.Router();

// Tüm km kayıtlarını getir
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('km_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Km kayıtları getirilirken hata:', error);
    res.status(500).json({ error: 'Km kayıtları alınırken bir hata oluştu.' });
  }
});

// Yeni km kaydı ekle
router.post('/', async (req, res) => {
  const { vehicleId, km, date } = req.body;
  try {
    const { data, error } = await supabase
      .from('km_records')
      .insert([
        { 
          vehicleId, 
          km, 
          date: new Date(date).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Km kaydı eklenirken hata:', error);
    res.status(500).json({ error: 'Km kaydı eklenirken bir hata oluştu.' });
  }
});

export default router;