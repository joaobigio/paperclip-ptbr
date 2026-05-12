#!/usr/bin/env node
//
// translate-to-ptbr.mjs
// =====================
// Traduz os JSONs de ui/src/i18n/locales/en/ → ui/src/i18n/locales/pt-BR/
// usando Claude Sonnet via Anthropic API.
//
// Uso:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/translate-to-ptbr.mjs
//
// Comportamento:
//   - 1 chamada API por arquivo (16 arquivos → 16 chamadas)
//   - Concurrency: 3 simultâneas (evita rate limit)
//   - Skip se arquivo pt-BR já existir (idempotente — pode rodar de novo)
//   - Use FORCE=1 pra refazer tudo
//
// Preserva:
//   - Chaves de namespace (identical keys)
//   - Interpolations {{variavel}} e {variavel}
//   - Plurais (chaves com _one, _other)
//   - HTML/Markdown se houver
//   - Especial: nomes próprios (Paperclip, OpenAI, Claude, etc) ficam em inglês

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC_DIR = resolve(ROOT, 'ui/src/i18n/locales/en')
const DST_DIR = resolve(ROOT, 'ui/src/i18n/locales/pt-BR')

const API_KEY = process.env.ANTHROPIC_API_KEY
if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY não setada. Use: ANTHROPIC_API_KEY=sk-ant-... node scripts/translate-to-ptbr.mjs')
  process.exit(1)
}

const FORCE = process.env.FORCE === '1'
const MODEL = process.env.MODEL || 'claude-sonnet-4-5'
const CONCURRENCY = 3

const SYSTEM_PROMPT = `You are a professional Brazilian Portuguese localization expert specializing in business software.
You will receive a JSON file with English UI strings used in Paperclip, an open-source app for managing AI agents at work.

TRANSLATE the values from English to Brazilian Portuguese (pt-BR) following these strict rules:

1. **Keys must remain IDENTICAL** — never translate keys, only values.
2. **Preserve interpolations**: \`{{variable}}\` and \`{variable}\` and \`%{variable}\` stay intact.
3. **Preserve HTML/Markdown**: tags like <b>, <a href="...">, **bold**, etc. stay intact.
4. **Preserve special chars**: \\u2026 (…), \\n, \\t etc.
5. **Brand names stay in English**: "Paperclip", "OpenAI", "Claude", "Cursor", "Codex", "Gemini", "GitHub", "Slack", "Linear", etc.
6. **Technical jargon**:
   - "API" → "API"
   - "OAuth" → "OAuth"
   - "Token" → "Token" (não traduzir)
   - "MCP" → "MCP"
   - "Webhook" → "Webhook"
   - "Plugin" → "Plugin" (já dicionarizado em PT)
7. **Tone**:
   - Use "você" (não "tu" ou "vós"). Tom profissional, direto.
   - Evite traduções literais que soem estranhas. "Save changes" → "Salvar alterações" (não "Salvar mudanças").
   - "Get Started" → "Começar" (não "Faça começar")
8. **Common conventions**:
   - "Email" → "E-mail" (com hífen)
   - "Settings" → "Configurações"
   - "Dashboard" → "Painel" ou "Dashboard" (ambos aceitos, prefira "Painel")
   - "Sign in" → "Entrar"
   - "Sign up" → "Cadastrar-se"
   - "Sign out" → "Sair"
   - "Cancel" → "Cancelar"
   - "Loading…" → "Carregando…"
   - "Working…" → "Processando…" (ou "Trabalhando…" se contexto for de agente IA)
9. **Plurals**: se ver \`_one\` ou \`_other\` (i18next plurals), traduza ambos consistente.

OUTPUT: return ONLY the translated JSON, no markdown fences, no commentary. Identical structure.`

async function translateFile(filename) {
  const srcPath = resolve(SRC_DIR, filename)
  const dstPath = resolve(DST_DIR, filename)

  if (!FORCE && existsSync(dstPath)) {
    console.log(`⏩ skip ${filename} (já existe; use FORCE=1 pra refazer)`)
    return { filename, status: 'skipped' }
  }

  const enContent = readFileSync(srcPath, 'utf8')
  const enJson = JSON.parse(enContent) // valida que é JSON ok

  const startedAt = Date.now()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Translate this JSON file (\`${filename}\`) to Brazilian Portuguese (pt-BR), following all rules in the system prompt:\n\n${JSON.stringify(enJson, null, 2)}`,
        },
      ],
    }),
  })

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`HTTP ${res.status} on ${filename}: ${errBody.substring(0, 400)}`)
  }

  const data = await res.json()
  let translated = data.content[0]?.text || ''

  // Limpa fences accidentais (se o modelo escapar de instrução)
  translated = translated.trim()
  if (translated.startsWith('```json')) {
    translated = translated.replace(/^```json\s*/, '').replace(/```\s*$/, '')
  } else if (translated.startsWith('```')) {
    translated = translated.replace(/^```\s*/, '').replace(/```\s*$/, '')
  }
  translated = translated.trim()

  // Valida JSON
  let parsed
  try {
    parsed = JSON.parse(translated)
  } catch (e) {
    throw new Error(`JSON inválido em ${filename}: ${e.message}\n\nResposta (primeiros 500 chars):\n${translated.substring(0, 500)}`)
  }

  // Valida que keys batem com o original (top-level pelo menos)
  const enKeys = Object.keys(enJson).sort().join(',')
  const ptKeys = Object.keys(parsed).sort().join(',')
  if (enKeys !== ptKeys) {
    console.warn(`⚠️ ${filename}: top-level keys diferem!\n  en: ${enKeys}\n  pt: ${ptKeys}`)
  }

  // Salva com formatação consistente
  writeFileSync(dstPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8')

  const sizeKB = (translated.length / 1024).toFixed(1)
  const usage = data.usage || {}
  console.log(`✓ ${filename.padEnd(20)} ${elapsed}s · ${sizeKB} KB · in:${usage.input_tokens || '?'} out:${usage.output_tokens || '?'}`)
  return { filename, status: 'translated', elapsed, usage }
}

async function runWithConcurrency(items, limit, fn) {
  const results = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try {
        const r = await fn(items[idx])
        results[idx] = r
      } catch (err) {
        results[idx] = { filename: items[idx], status: 'error', error: err.message }
        console.error(`✗ ${items[idx]}: ${err.message}`)
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function main() {
  if (!existsSync(DST_DIR)) {
    mkdirSync(DST_DIR, { recursive: true })
    console.log(`📁 criado ${DST_DIR}`)
  }

  const files = readdirSync(SRC_DIR).filter(f => f.endsWith('.json')).sort()
  console.log(`📚 ${files.length} arquivos para traduzir (modelo: ${MODEL}, concurrency: ${CONCURRENCY})\n`)

  const t0 = Date.now()
  const results = await runWithConcurrency(files, CONCURRENCY, translateFile)
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1)

  const ok = results.filter(r => r.status === 'translated').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error').length

  const totalIn = results.reduce((sum, r) => sum + (r.usage?.input_tokens || 0), 0)
  const totalOut = results.reduce((sum, r) => sum + (r.usage?.output_tokens || 0), 0)

  console.log('')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✓ traduzidos: ${ok}`)
  console.log(`⏩ skipped:    ${skipped}`)
  console.log(`✗ erros:      ${errors}`)
  console.log(`⏱  total:      ${totalSec}s`)
  console.log(`📊 tokens:     in=${totalIn.toLocaleString()} · out=${totalOut.toLocaleString()}`)
  // Sonnet 4.5: $3/1M in, $15/1M out
  const cost = (totalIn / 1_000_000) * 3 + (totalOut / 1_000_000) * 15
  console.log(`💰 custo aprox: $${cost.toFixed(3)}`)

  if (errors > 0) process.exit(1)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
