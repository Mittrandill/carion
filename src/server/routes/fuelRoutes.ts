import express from 'express';
import { supabase } from '../lib/supabaseClient';

const router = express.Router();

// Tüm yakıt kayıtlarını getir
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Yakıt kayıtları getirilirken hata:', error);
    res.status(500).json({ error: 'Yakıt kayıtları getirilirken bir hata oluştu' });
  }
});

// Yeni bir yakıt kaydı ekle
router.post('/', async (req, res) => {
  try {
    const { date, receiptNo, station, amount, unitPrice, total, vehicleId } = req.body;
    const { data, error } = await supabase
      .from('fuel_records')
      .insert([
        { 
          date, 
          receiptNo, 
          station, 
          amount, 
          unitPrice, 
          total, 
          vehicleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Yakıt kaydı oluşturulurken hata:', error);
    res.status(400).json({ error: 'Yakıt kaydı oluşturulurken bir hata oluştu' });
  }
});

// Bir yakıt kaydını güncelle
router.put('/:id', async (req, res) => {
  try {
    const { date, receiptNo, station, amount, unitPrice, total, vehicleId } = req.body;
    const { data, error } = await supabase
      .from('fuel_records')
      .update({ 
        date, 
        receiptNo, 
        station, 
        amount, 
        unitPrice, 
        total, 
        vehicleId,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Yakıt kaydı güncellenirken hata:', error);
    res.status(400).json({ error: 'Yakıt kaydı güncellenirken bir hata oluştu' });
  }
});

// Bir yakıt kaydını sil
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('fuel_records')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Yakıt kaydı silinirken hata:', error);
    res.status(400).json({ error: 'Yakıt kaydı silinirken bir hata oluştu' });
  }
});

export default router;