import express            from 'express'
import helmet             from 'helmet'
import cors               from 'cors'
import multer             from 'multer'
import { fileURLToPath }  from 'url'
import { dirname, join }  from 'path'
import { router as processRouter, initCapabilities } from './routes/process.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT ?? 3001

const behindProxy = process.env.REVERSE_PROXY === 'true'
app.set('trust proxy', behindProxy ? 1 : false)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // blob: is required for uploaded image previews and processed results
      'img-src': ["'self'", 'data:', 'blob:'],
    },
  },
}))

const domainName = process.env.DOMAIN_NAME
const corsOrigin = domainName ? `https://${domainName}` : '*'
app.use(cors({ origin: corsOrigin }))

app.use(express.json({ limit: '1mb' }))

const ALLOWED_MIMES = new Set([
  'image/jpeg','image/png','image/webp','image/gif',
  'image/tiff','image/bmp','image/heic','image/heif','image/avif',
])

function extensionFromBuffer(buf) {
  if (buf[0]===0xFF && buf[1]===0xD8 && buf[2]===0xFF) return 'jpg'
  if (buf[0]===0x89 && buf[1]===0x50 && buf[2]===0x4E && buf[3]===0x47) return 'png'
  if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46 &&
      buf[8]===0x57 && buf[9]===0x45 && buf[10]===0x42 && buf[11]===0x50) return 'webp'
  if (buf[0]===0x47 && buf[1]===0x49 && buf[2]===0x46) return 'gif'
  if ((buf[0]===0x49 && buf[1]===0x49 && buf[2]===0x2A) ||
      (buf[0]===0x4D && buf[1]===0x4D && buf[2]===0x00 && buf[3]===0x2A)) return 'tiff'
  if (buf[0]===0x42 && buf[1]===0x4D) return 'bmp'
  // HEIF/HEIC: ftyp box at byte offset 4
  if (buf.length >= 12 &&
      buf[4]===0x66 && buf[5]===0x74 && buf[6]===0x79 && buf[7]===0x70) return 'heic'
  const e = new Error('Unsupported image format')
  e.status = 415
  throw e
}

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB ?? 50)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      const e = new Error('Unsupported MIME type')
      e.status = 415
      return cb(e)
    }
    cb(null, true)
  },
})

function uploadAndValidate(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: `File exceeds ${maxFileSizeMb} MB limit` })
      }
      return res.status(err.status ?? 400).json({ message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    try {
      req.file.detectedExt = extensionFromBuffer(req.file.buffer)
    } catch (e) {
      return res.status(e.status ?? 415).json({ message: e.message })
    }
    next()
  })
}

app.post('/api/process', uploadAndValidate, (req, res, next) => {
  req.url = '/process'
  processRouter(req, res, next)
})

app.use('/api', processRouter)

if (process.env.NODE_ENV === 'production') {
  const pub = join(__dirname, 'public')
  app.use(express.static(pub))
  app.get('/{*path}', (_req, res) => res.sendFile(join(pub, 'index.html')))
}

initCapabilities().then(() => {
  const server = app.listen(PORT, () => console.log(`Server listening on :${PORT}`))

  // Graceful shutdown: stop accepting new connections and wait for in-flight
  // requests (including running magick processes) to complete before exit.
  function shutdown() {
    console.log('SIGTERM received — shutting down gracefully')
    server.close(() => {
      console.log('All connections closed')
      process.exit(0)
    })
    // Hard kill after 30 s if requests are still running
    setTimeout(() => {
      console.error('Graceful shutdown timed out — forcing exit')
      process.exit(1)
    }, 30_000).unref()
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT',  shutdown)
})
