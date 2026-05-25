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
          text: `Extract receipt data as JSON. Return ONLY valid JSON — no markdown, no code fences, no extra text.

CRITICAL: Every item in the "items" array MUST have a "sign" field set to either "+" or "-". This is not optional.

Output schema:
{
  "title": "short store/expense name",
  "date": "YYYY-MM-DD or null",
  "categoryId": null,
  "total": <grand total as positive decimal>,
  "items": [
    { "name": "item name", "amount": <positive decimal>, "sign": "+" },
    { "name": "savings/discount name", "amount": <positive decimal>, "sign": "-" }
  ]
}

sign field meaning:
  "+" = adds to total (regular purchase, tax, tip, service charge)
  "-" = subtracts from total (discount, savings, coupon, instant savings, reward)
  amount is ALWAYS positive regardless of sign.

Example — Costco with savings:
  Input line: "ADIDAS FLEX   35.99"  → { "name": "ADIDAS FLEX", "amount": 35.99, "sign": "+" }
  Input line: "/1955469       7.00-" → { "name": "ADIDAS FLEX Savings", "amount": 7.00, "sign": "-" }
  Input line: "ORALB10CC     99.99"  → { "name": "ORALB10CC", "amount": 99.99, "sign": "+" }
  Input line: "-A $30.00"            → { "name": "ORALB10CC Savings", "amount": 30.00, "sign": "-" }
  Input line: "Tax            12.28" → { "name": "Tax", "amount": 12.28, "sign": "+" }

Detection rules:
- A line that starts with "/" followed by digits is a savings line → sign: "-"
- A number with a trailing "-" (e.g. "7.00-") is a deduction → sign: "-"
- Lines with "-A", "INSTANT SAVINGS", "COUPON", "DISCOUNT", "REWARD" → sign: "-"
- Tax, Tip, Service Charge → sign: "+"
- DO NOT pre-subtract discounts; list each line as its own item with correct sign
- Exclude subtotal lines
- Quantity > 1: amount = line total`,
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
        const sign = item.sign === '-' ? '−' : '+'
        console.log(`    ${sign} ${item.name}: $${item.amount}`)
      }
    }
  } catch {
    console.error('❌  Could not parse JSON from LLM response')
  }
} catch (err) {
  console.error('❌  Fetch failed:', err.message)
}
