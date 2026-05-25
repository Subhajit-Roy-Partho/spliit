/**
 * Local test for NanoGPT receipt parsing.
 * Usage: node test/test-receipt.mjs [path-to-image]
 * Requires NANOGPT_API_KEY and NANOGPT_BASE_URL in .env.local
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env manually
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const env = {}
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const apiKey = env.NANOGPT_API_KEY
const baseURL = env.NANOGPT_BASE_URL

if (!apiKey || !baseURL) {
  console.error('❌  NANOGPT_API_KEY or NANOGPT_BASE_URL not set in .env.local')
  process.exit(1)
}

const imagePath =
  process.argv[2] ??
  path.join(__dirname, 'photo_2026-05-25 01.01.43.jpeg')

if (!fs.existsSync(imagePath)) {
  console.error('❌  Image not found:', imagePath)
  process.exit(1)
}

const imageBuffer = fs.readFileSync(imagePath)
const ext = path.extname(imagePath).toLowerCase()
const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
const base64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`

const model = process.argv[3] ?? 'moonshotai/kimi-latest'
console.log(`📷  Image: ${path.basename(imagePath)} (${(imageBuffer.length / 1024).toFixed(0)} KB)`)
console.log(`🤖  Model: ${model}`)
console.log(`🔗  Base URL: ${baseURL}\n`)

const body = JSON.stringify({
  model,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this receipt image and extract the following information as JSON.

Return ONLY valid JSON with no markdown, no code blocks, no extra text.

Schema:
{
  "title": "short expense title",
  "date": "YYYY-MM-DD or null",
  "categoryId": null,
  "total": <number>,
  "items": [ { "name": "item name", "amount": <number> } ]
}

Rules:
- Costco: items may show shelf price + savings line like "-A $X". Net = shelf - savings.
- Negative lines are discounts; subtract from item above, not a separate item.
- Tax, tip, service charge → include as separate items named "Tax", "Tip", etc.
- Subtotals excluded.
- Quantity > 1: amount = total for line.`,
        },
        { type: 'image_url', image_url: { url: base64 } },
      ],
    },
  ],
})

console.log(`📤  Sending ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB to LLM…`)
const t0 = Date.now()

try {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body,
  })

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`📥  Status: ${res.status} (${elapsed}s)`)

  const text = await res.text()
  if (!res.ok) {
    console.error('❌  Error response:', text.slice(0, 500))
    process.exit(1)
  }

  const data = JSON.parse(text)
  const content = data.choices?.[0]?.message?.content ?? '{}'
  console.log('\n📄  Raw response:\n', content)

  try {
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim())
    console.log('\n✅  Parsed result:')
    console.log('  Title:', parsed.title)
    console.log('  Date:', parsed.date)
    console.log('  Total:', parsed.total)
    console.log('  Items:', parsed.items?.length ?? 0)
    if (parsed.items?.length) {
      for (const item of parsed.items) {
        console.log(`    • ${item.name}: $${item.amount}`)
      }
    }
  } catch {
    console.error('❌  Could not parse JSON from LLM response')
  }
} catch (err) {
  console.error('❌  Fetch failed:', err.message)
}
