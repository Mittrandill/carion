import express from 'express';
import { supabase } from '../lib/supabaseClient';

const router = express.Router();

// Tüm lastik kayıtlarını getir
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tire_records')
      .select('*')
      .order('changeDate', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Lastik kayıtları getirilirken hata:', error);
    res.status(500).json({ error: 'Lastik kayıtları alınırken bir hata oluştu.' });
  }
});

// Yeni lastik kaydı ekle
router.post('/', async (req, res) => {
  const { vehicleId, tireType, changeDate, estimatedChangeDate } = req.body;
  try {
    const { data, error } = await supabase
      .from('tire_records')
      .insert([
        { 
          vehicleId, 
          tireType, 
          changeDate: new Date(changeDate).toISOString(),
          estimatedChangeDate: new Date(estimatedChangeDate).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Lastik kaydı eklenirken hata:', error);
    res.status(500).json({ error: 'Lastik kaydı eklenirken bir hata oluştu.' });
  }
});

// Lastik kaydını güncelle
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { vehicleId, tireType, changeDate, estimatedChangeDate } = req.body;
  try {
    const { data, error } = await supabase
      .from('tire_records')
      .update({ 
        vehicleId, 
        tireType, 
        changeDate: new Date(changeDate).toISOString(),
        estimatedChangeDate: new Date(estimatedChangeDate).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Lastik kaydı güncellenirken hata:', error);
    res.status(500).json({ error: 'Lastik kaydı güncellenirken bir hata oluştu.' });
  }
});

// Lastik kaydını sil
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('tire_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ message: 'Lastik kaydı başarıyla silindi.' });
  } catch (error) {
    console.error('Lastik kaydı silinirken hata:', error);
    res.status(500).json({ error: 'Lastik kaydı silinirken bir hata oluştu.' });
  }
});

export default router;