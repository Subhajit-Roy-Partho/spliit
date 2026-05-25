export const maxDuration = 60

import { auth } from '@/auth'
import { getCategories } from '@/lib/api'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const MODELS = {
  accurate: process.env.NANOGPT_MODEL_ACCURATE ?? 'alibaba/qwen3.6-27b',
  fast: process.env.NANOGPT_MODEL_FAST ?? 'alibaba/qwen3.6-27b',
}

type ModelKey = keyof typeof MODELS

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    imageBase64?: string
    model?: string
  }
  const { imageBase64, model: modelKey } = body
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })
  }

  const apiKey = process.env.NANOGPT_API_KEY
  const baseURL = process.env.NANOGPT_BASE_URL

  if (!apiKey || !baseURL) {
    return NextResponse.json(
      { error: 'Receipt parsing not configured' },
      { status: 503 },
    )
  }

  const model =
    MODELS[(modelKey as ModelKey) in MODELS ? (modelKey as ModelKey) : 'accurate']

  const client = new OpenAI({ apiKey, baseURL, timeout: 55_000 })
  const categories = await getCategories()

  try {
    const completion = await client.chat.completions.create({
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
  "categoryId": "matching ID from category list or null",
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
- DO NOT pre-subtract discounts from the item above; list each as its own item
- Exclude subtotal lines (lines labeled "Subtotal", "Before Tax")
- Quantity > 1: amount = line total (e.g. 2 × 3.99 → amount: 7.98)

Categories: ${categories.map((c) => formatCategoryForAIPrompt(c)).join(', ')}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
    })

    const raw = completion.choices.at(0)?.message.content ?? '{}'
    const parsed = JSON.parse(
      raw.replace(/```json|```/g, '').trim(),
    ) as Record<string, unknown>

    return NextResponse.json({
      title: typeof parsed.title === 'string' ? parsed.title : null,
      date: typeof parsed.date === 'string' ? parsed.date : null,
      categoryId: parsed.categoryId ? String(parsed.categoryId) : null,
      total: typeof parsed.total === 'number' ? parsed.total : null,
      items: Array.isArray(parsed.items)
        ? (parsed.items as unknown[])
            .filter(
              (i): i is { name: string; amount: number; sign?: string } =>
                typeof i === 'object' &&
                i !== null &&
                'name' in i &&
                'amount' in i,
            )
            .map((i) => ({
              name: String(i.name),
              amount: Math.abs(Number(i.amount) || 0),
              sign: (i.sign === '-' ? '-' : '+') as '+' | '-',
            }))
        : [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[receipt-parse]', message)
    const isTimeout = message.toLowerCase().includes('timeout') || message.includes('ETIMEDOUT')
    return NextResponse.json(
      {
        error: isTimeout
          ? 'The accurate model timed out. Try Fast mode instead.'
          : `Extraction failed: ${message}`,
      },
      { status: isTimeout ? 504 : 500 },
    )
  }
}
