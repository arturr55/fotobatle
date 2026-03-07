import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { checkAndFinishExpiredBattles, activateUpcomingBattles } from './services/battleService'
import { resetAchievementsIfNewMonth } from './services/achievementService'

import usersRouter from './routes/users'
import battlesRouter from './routes/battles'
import balanceRouter from './routes/balance'
import tasksRouter from './routes/tasks'

const app = express()
const PORT = parseInt(process.env.PORT || '3000')

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')))

app.use('/api/users', usersRouter)
app.use('/api/battles', battlesRouter)
app.use('/api/balance', balanceRouter)
app.use('/api/tasks', tasksRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Check battles every minute
setInterval(async () => {
  try {
    await activateUpcomingBattles()
    await checkAndFinishExpiredBattles()
    await resetAchievementsIfNewMonth()
  } catch (err) {
    console.error('Scheduler error:', err)
  }
}, 60 * 1000)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
