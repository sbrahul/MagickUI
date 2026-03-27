/**
 * Sends the original file + current ops to /api/process.
 * Returns { blobUrl: string, meta: { format, sizeBytes } }
 * Throws { message, stderr } on error; throws DOMException name='AbortError' on cancel.
 */
export async function processImage({ file, ops, output, signal }) {
  // Strip keys that are null or false — they represent disabled ops and would
  // trip server-side range validation (e.g. gamma: null → 0, out of [0.1,10]).
  const activeOps = Object.fromEntries(
    Object.entries(ops).filter(([, v]) => v !== null && v !== false)
  )

  const form = new FormData()
  form.append('file', file)
  form.append('ops', JSON.stringify(activeOps))
  form.append('outputFormat',  output.format)
  form.append('quality',       String(output.quality))
  form.append('strip',         String(output.strip))
  form.append('interlace',     String(output.interlace))
  form.append('losslessWebp',  String(output.losslessWebp))

  const res = await fetch('/api/process', { method: 'POST', body: form, signal })

  if (!res.ok) {
    let body = {}
    try { body = await res.json() } catch {}
    throw { message: body.message ?? `Server error ${res.status}`, stderr: body.stderr ?? '' }
  }

  const blob    = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const meta    = {
    format:    output.format,
    sizeBytes: blob.size,
  }
  return { blobUrl, meta }
}

export async function fetchCapabilities() {
  const res = await fetch('/api/capabilities')
  if (!res.ok) return { inputFormats: [], outputFormats: [] }
  return res.json()
}
