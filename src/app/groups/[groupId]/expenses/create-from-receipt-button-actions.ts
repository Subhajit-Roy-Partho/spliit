'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import OpenAI from 'openai'

// Prefer NanoGPT proxy; fall back to OpenAI if configured
function getClient() {
  const nanoKey = process.env.NANOGPT_API_KEY
  const nanoUrl = process.env.NANOGPT_BASE_URL
  if (nanoKey && nanoUrl) {
    return new OpenAI({ apiKey: nanoKey, baseURL: nanoUrl })
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY })
}

export async function extractExpenseInformationFromImage(imageUrl: string) {
  'use server'
  const categories = await getCategories()
  const client = getClient()
  const model = process.env.NANOGPT_MODEL_ACCURATE ?? 'moonshotai/kimi-latest'

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This image contains a receipt.
Read the total amount and store it as a non-formatted number without any other text or currency.
Then guess the category for this receipt among the following categories and store its ID: ${categories.map(
              (category) => formatCategoryForAIPrompt(category),
            )}.
Guess the expense's date and store it as yyyy-mm-dd.
Guess a title for the expense.
Return the amount, the category, the date and the title with just a comma between them, without anything else.`,
          },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: imageUrl } }],
      },
    ],
  })

  const [amountString, categoryId, date, title] = completion.choices
    .at(0)
    ?.message.content?.split(',') ?? [null, null, null, null]
  return { amount: Number(amountString), categoryId, date, title }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
