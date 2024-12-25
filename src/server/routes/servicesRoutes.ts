import express from 'express';
import { supabase } from '../lib/supabaseClient';
import { ServiceRecord } from '../types/serviceRecord';

const router = express.Router();

// Tüm servis kayıtlarını getir
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yeni servis kaydı ekle
router.post('/', async (req, res) => {
  try {
    const newRecord: Omit<ServiceRecord, 'id'> = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('service_records')
      .insert([newRecord])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Belirli bir servis kaydını güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecord: Partial<ServiceRecord> = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('service_records')
      .update(updatedRecord)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Belirli bir servis kaydını sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('service_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;