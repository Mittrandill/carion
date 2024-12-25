import express from 'express';
import { supabase } from '../utils/supabaseClient';

const router = express.Router();

// Tüm lastikleri getir
router.get('/tires', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tire_stocks').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Lastikler alınırken bir hata oluştu.' });
  }
});

// Tüm lastik kayıtlarını getir
router.get('/tire-records', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tire_records').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Lastik kayıtları alınırken bir hata oluştu.' });
  }
});

// Yeni lastik ekle
router.post('/tires', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tire_stocks').insert([req.body]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Lastik eklenirken bir hata oluştu.' });
  }
});

// Yeni lastik kaydı ekle
router.post('/tire-records', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tire_records').insert([req.body]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Lastik kaydı eklenirken bir hata oluştu.' });
  }
});

// Lastik güncelle
router.put('/tires/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tire_stocks')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Lastik güncellenirken bir hata oluştu.' });
  }
});

// Lastik kaydı güncelle
router.put('/tire-records/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tire_records')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Lastik kaydı güncellenirken bir hata oluştu.' });
  }
});

export default router;