import express from 'express';
import { supabase } from '../lib/supabaseClient';

const router = express.Router();

// Tüm bakım kayıtlarını getir
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yeni bakım kaydı ekle
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Belirli bir bakım kaydını güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('maintenance_records')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Belirli bir bakım kaydını sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;