import { Router }             from 'express'
import { execFile }            from 'child_process'
import { randomUUID }          from 'crypto'
import { mkdir, writeFile, readFile, rm } from 'fs/promises'
import { spawn }               from 'child_process'
import { join }                from 'path'
import { validate }            from '../lib/validate.js'
import { buildArgs }           from '../lib/buildArgs.js'

export const router = Router()

// ── Capabilities ────────────────────────────────────────────────────────────

let cachedCapabilities = null

async function probeCapabilities() {
  return new Promise((resolve) => {
    execFile('magick', ['-list', 'format'], { timeout: 15_000 }, (err, stdout) => {
      if (err) {
        console.error('magick -list format failed:', err.message)
        resolve({ inputFormats: [], outputFormats: [] })
        return
      }
      const lines = stdout.split('\n')
      const inputFormats  = []
      const outputFormats = []
      // Format names to map to user-facing names
      const WANTED = new Map([
        ['JPEG','jpeg'], ['JPG','jpeg'], ['PNG','png'], ['WEBP','webp'],
        ['AVIF','avif'], ['TIFF','tiff'], ['TIF','tiff'], ['GIF','gif'],
        ['BMP','bmp'], ['HEIC','heic'], ['HEIF','heic'],
      ])
      for (const line of lines) {
        // Mode column is 3 chars: e.g. rw+, r--, rw-
        const match = line.match(/^\s+(\w+)\*?\s+\S+\s+([r-][w-][+\-])\s/i)
        if (!match) continue
        const fmt  = match[1].toUpperCase()
        const mode = match[2]
        if (!WANTED.has(fmt)) continue
        const normalized = WANTED.get(fmt)
        if (mode[0] === 'r' && !inputFormats.includes(normalized))  inputFormats.push(normalized)
        if (mode[1] === 'w' && !outputFormats.includes(normalized)) outputFormats.push(normalized)
      }
      resolve({ inputFormats, outputFormats })
    })
  })
}

export async function initCapabilities() {
  cachedCapabilities = await probeCapabilities()
  console.log('Capabilities:', cachedCapabilities)
}

router.get('/capabilities', (_req, res) => {
  res.json(cachedCapabilities ?? { inputFormats: [], outputFormats: [] })
})

// ── Concurrency limiter ─────────────────────────────────────────────────────
// Prevents server resource exhaustion when many clients submit jobs at once.
// Excess requests receive a 503 so the client can retry rather than queuing
// indefinitely and starving memory.

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_OPS ?? 4)
let activeOps = 0

// ── MIME map ────────────────────────────────────────────────────────────────

const MIME_FROM_FORMAT = {
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  gif:  'image/gif',
}

// ── Process ─────────────────────────────────────────────────────────────────

router.post('/process', async (req, res) => {
  if (activeOps >= MAX_CONCURRENT) {
    return res.status(503).json({ message: 'Server busy — too many concurrent operations, please retry' })
  }
  activeOps++
  const tmpDir = join('/tmp', randomUUID())
  try {
    // 1. Parse + validate
    let ops, output
    try {
      const rawOps = JSON.parse(req.body.ops || '{}')
      const rawOut = {
        format:       req.body.outputFormat ?? 'jpeg',
        quality:      Number(req.body.quality ?? 85),
        strip:        req.body.strip         === 'true',
        interlace:    req.body.interlace     === 'true',
        losslessWebp: req.body.losslessWebp  === 'true',
      }
      ;({ ops, output } = validate(rawOps, rawOut))
    } catch (e) {
      return res.status(e.status ?? 400).json({ message: e.message ?? 'Invalid parameters' })
    }

    // 2. Determine extension from magic bytes (already validated by multer fileFilter)
    const ext     = req.file.detectedExt
    const inPath  = join(tmpDir, `input.${ext}`)
    const outPath = join(tmpDir, `output.${output.format}`)

    // 3. Write uploaded file to tmpdir
    await mkdir(tmpDir, { recursive: true })
    await writeFile(inPath, req.file.buffer)

    // 4. Build args + spawn
    const args = await buildArgs(ops, inPath, outPath, output)
    await new Promise((resolve, reject) => {
      const proc = spawn('magick', args, { timeout: 120_000 })
      let stderr = ''
      proc.stderr.on('data', d => { stderr += d.toString() })
      proc.on('close', code => {
        if (code === 0) resolve()
        else reject({ status: 422, message: 'ImageMagick error', stderr })
      })
      proc.on('error', err => reject({ status: 500, message: err.message, stderr }))
    })

    // 5. Stream result
    const result = await readFile(outPath)
    const mime   = MIME_FROM_FORMAT[output.format] ?? 'application/octet-stream'
    res
      .set('Content-Type', mime)
      .set('X-Image-Format', output.format)
      .send(result)

  } catch (e) {
    res.status(e.status ?? 500).json({ message: e.message, stderr: e.stderr ?? '' })
  } finally {
    activeOps--
    rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
})
