import express from 'express'
import vehicleRoutes from './routes/vehicleRoutes'
import taskRoutes from './routes/taskRoutes'
import fuelRoutes from './routes/fuelRoutes'
import authRoutes from './routes/authRoutes'
import maintenanceRoutes from './routes/maintenanceRecords'
import tireRecordsRoutes from './routes/tireRecordsRoutes'
import kmRecordsRoutes from './routes/kmRecords'


import { checkDbConnection } from './db'

const app = express()

app.use(express.json())

// Supabase bağlantısını kontrol et
checkDbConnection().then(() => {
  console.log('Supabase connected')
}).catch((err) => {
  console.error('Failed to connect to Supabase', err)
  process.exit(1) // Bağlantı başarısız olursa uygulamayı sonlandır
})

app.use('/api/vehicles', vehicleRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/fuel', fuelRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/tire', tireRecordsRoutes)
app.use('/api/km', kmRecordsRoutes)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})