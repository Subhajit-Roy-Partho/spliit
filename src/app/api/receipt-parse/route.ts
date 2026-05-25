import { auth } from '@/auth'
import { getCategories } from '@/lib/api'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const MODELS = {
  accurate: process.env.NANOGPT_MODEL_ACCURATE ?? 'moonshotai/kimi-latest',
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

  const client = new OpenAI({ apiKey, baseURL })
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
              text: `Analyze this receipt image and extract the following information as JSON.

Return ONLY valid JSON with no markdown, no code blocks, no extra text.

Schema:
{
  "title": "short expense title (e.g. 'Dinner at Joe\\'s', 'Groceries', 'Amazon order')",
  "date": "YYYY-MM-DD or null",
  "categoryId": "best matching category ID from list below, or null",
  "total": <number: grand total as decimal, e.g. 45.50>,
  "items": [
    { "name": "item name", "amount": <number: item price as decimal> },
    ...
  ]
}

Categories: ${categories.map((c) => formatCategoryForAIPrompt(c)).join(', ')}

Rules:
- items should be individual line items, not subtotals/taxes/tips
- if you cannot extract items, return items as []
- amount values are decimals (not cents)
- total is the grand total including tax/tips if visible

Receipt format quirks to handle:
- Costco / warehouse clubs: items sometimes show two prices — a shelf price and an instant savings line like "-A $X.XX". The real price is shelf price minus savings. Only include the net item price in amount.
- Some receipts show a negative line (e.g. "-2.00") as a discount/coupon — subtract it from the item above it, do not include it as a separate item.
- Tax lines, tips, service charges, and subtotals should NOT appear in items[].
- If an item quantity > 1 (e.g. "2 @ 3.99"), amount should be the total for that line (2 × 3.99 = 7.98).`,
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
              (i): i is { name: string; amount: number } =>
                typeof i === 'object' &&
                i !== null &&
                'name' in i &&
                'amount' in i,
            )
            .map((i) => ({
              name: String(i.name),
              amount: Number(i.amount) || 0,
            }))
        : [],
    })
  } catch (err) {
    console.error('[receipt-parse]', err)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
