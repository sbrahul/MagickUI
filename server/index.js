import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Stubs — implemented in Phase 2
app.get('/api/capabilities', (_req, res) => res.status(501).json({ error: 'Not implemented' }))
app.post('/api/process',     (_req, res) => res.status(501).json({ error: 'Not implemented' }))

// Static + SPA fallback (production only)
if (process.env.NODE_ENV === 'production') {
  const pub = join(__dirname, 'public')
  app.use(express.static(pub))
  app.get('/{*path}', (_req, res) => res.sendFile(join(pub, 'index.html')))
}

app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
