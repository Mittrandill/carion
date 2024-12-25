mport { createClient } from '@supabase/supabase-js'

// Supabase bağlantı bilgilerini .env dosyasından alın
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing')
}

// Supabase istemcisini oluşturun
export const supabase = createClient(supabaseUrl, supabaseKey)

// Veritabanı bağlantısını kontrol etmek için bir fonksiyon
export async function checkDbConnection() {
  try {
    const { data, error } = await supabase.from('vehicles').select('id').limit(1)
    if (error) throw error
    console.log('Supabase connection successful')
  } catch (error) {
    console.error('Failed to connect to Supabase:', error)
    throw error
  }