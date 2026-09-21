import OpenAI from 'openai'

import { env } from './env'

/**
 * Build an OpenAI client when needed.
 *
 * NanoGPT (or any OpenAI-compatible proxy) works by pointing OPENAI_BASE_URL
 * at it. The legacy NANOGPT_API_KEY / NANOGPT_BASE_URL variables are honoured
 * as a fallback so existing Dhar deployments keep working unchanged.
 */
export function getOpenAIClient() {
  const apiKey = env.OPENAI_API_KEY ?? env.NANOGPT_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set.')
  }
  return new OpenAI({
    apiKey,
    baseURL: env.OPENAI_BASE_URL ?? env.NANOGPT_BASE_URL,
  })
}
