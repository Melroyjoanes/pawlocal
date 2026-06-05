/**
 * Telegram notification utility.
 * Returns Promise<void> — callers must await it before returning their Response
 * so Vercel's serverless runtime does not freeze the function mid-flight.
 * Silently resolves (never rejects) if env vars are missing or Telegram is down.
 */

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) return

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  }).catch(() => {}) // swallow errors — notification failure never blocks the user
}
