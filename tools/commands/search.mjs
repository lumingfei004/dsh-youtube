// 搜索：node youtube.mjs search <关键词> [--limit N] [--json]
import { search } from '../lib/yt.mjs'
import { config } from '../lib/config.mjs'

const argv = process.argv.slice(2)
const json = argv.includes('--json')
const li = argv.indexOf('--limit')
const limit = li >= 0 ? Number(argv[li + 1]) || 10 : Number(config().maxResults) || 10
const query = argv.find((a, i) => !a.startsWith('--') && !(li >= 0 && i === li + 1))

if (!query) {
  console.error('用法: node youtube.mjs search <关键词> [--limit N] [--json]')
  process.exit(2)
}

const rows = await search(query, limit)
if (json) {
  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

console.log(`\n搜索「${query}」· ${rows.length} 条\n`)
for (const r of rows) {
  const d = Number(r.duration)
  const dur = Number.isFinite(d) && d > 0 ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}` : ''
  console.log(`• [${r.id}] ${r.title ?? '(无标题)'}`)
  console.log(`  ${r.channel ?? r.uploader ?? ''}${dur ? ` · ${dur}` : ''} · https://youtu.be/${r.id}`)
}
