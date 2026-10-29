// 字幕：node youtube.mjs subtitle <id|url> [--lang zh.*,en.*] [--lines 40]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { downloadSubs } from '../lib/yt.mjs'

const argv = process.argv.slice(2)
const gi = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : '' }
const idOrUrl = argv.find((a) => !a.startsWith('--') && a !== gi('--lang') && a !== gi('--lines'))
const langs = gi('--lang') || 'en.*,zh.*'
const maxLines = Number(gi('--lines')) || 40

if (!idOrUrl) {
  console.error('用法: node youtube.mjs subtitle <video_id|url> [--lang zh.*,en.*] [--lines 40]')
  process.exit(2)
}
const url = idOrUrl.startsWith('http') ? idOrUrl : `https://www.youtube.com/watch?v=${idOrUrl}`

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-subs-'))
await downloadSubs(url, tmp, langs)

const files = fs.readdirSync(tmp).filter((f) => f.endsWith('.vtt'))
if (!files.length) {
  console.error('没有可用字幕（该视频可能未开启字幕）')
  process.exit(1)
}

// 优先中文字幕
files.sort((a, b) => (a.includes('.zh') ? -1 : 0) - (b.includes('.zh') ? -1 : 0) || a.localeCompare(b))
const file = path.join(tmp, files[0])
const raw = fs.readFileSync(file, 'utf8')

// 清洗 vtt：去掉 WEBVTT 头、时间行、内联标签、重复行
const lines = []
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t === 'WEBVTT' || t.startsWith('NOTE') || t.includes('-->') || /^\d+$/.test(t)) continue
  const clean = t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()
  if (!clean) continue
  if (lines[lines.length - 1] !== clean) lines.push(clean)
}

console.log(`字幕文件：${files[0]}（共 ${lines.length} 行）\n`)
for (const l of lines.slice(0, maxLines)) console.log(l)
if (lines.length > maxLines) console.log(`\n…（还有 ${lines.length - maxLines} 行）`)
fs.rmSync(tmp, { recursive: true, force: true })
