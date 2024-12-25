import express from 'express';
import { supabase } from '../../lib/supabaseClient'; // Supabase istemcini içe aktar

const router = express.Router();

// Tüm araçları getir
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Araçları getirirken hata oluştu' });
  }
});

// Yeni bir araç ekle
router.post('/', async (req, res) => {
  try {
    const { plate, make, model, year, visaValidUntil, status, fuelType, color, currentKm, type } = req.body;
    const { data, error } = await supabase
      .from('vehicles')
      .insert([
        {
          plate,
          make,
          model,
          year,
          visaValidUntil,
          status: status ? 1 : 0,
          fuelType,
          color,
          currentKm,
          type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);
    if (error) throw error;
    res.status(201).json(data[0]); // Yeni eklenen aracı geri döndür
  } catch (error) {
    res.status(400).json({ error: 'Araç eklerken hata oluştu' });
  }
});

// Bir aracı güncelle
router.put('/:id', async (req, res) => {
  try {
    const { plate, make, model, year, visaValidUntil, status, fuelType, color, currentKm, type } = req.body;
    const { data, error } = await supabase
      .from('vehicles')
      .update({
        plate,
        make,
        model,
        year,
        visaValidUntil,
        status: status ? 1 : 0,
        fuelType,
        color,
        currentKm,
        type,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json(data[0]); // Güncellenen aracı geri döndür
  } catch (error) {
    res.status(400).json({ error: 'Araç güncellenirken hata oluştu' });
  }
});

// Bir aracı sil
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vehicles').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send(); // İçerik yok
  } catch (error) {
    res.status(400).json({ error: 'Araç silinirken hata oluştu' });
  }
});

export default router;
