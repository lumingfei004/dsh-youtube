// 视频详情：node youtube.mjs video <id|url> [--json]
import { videoInfo } from '../lib/yt.mjs'

const argv = process.argv.slice(2)
const json = argv.includes('--json')
const idOrUrl = argv.find((a) => !a.startsWith('--'))
if (!idOrUrl) {
  console.error('用法: node youtube.mjs video <video_id|url> [--json]')
  process.exit(2)
}
const url = idOrUrl.startsWith('http') ? idOrUrl : `https://www.youtube.com/watch?v=${idOrUrl}`

const info = await videoInfo(url)
if (json) {
  console.log(JSON.stringify(info, null, 2))
  process.exit(0)
}

const d = Number(info.duration) || 0
const dur = d ? `${Math.floor(d / 60)} 分 ${d % 60} 秒` : '未知'
console.log(`
${info.title}
──────────────────────────────────
频道：${info.channel ?? info.uploader ?? ''}
时长：${dur} · 播放：${info.view_count ?? '?'} · 发布：${info.upload_date ?? ''}
链接：${info.webpage_url ?? url}
${info.chapters?.length ? `章节：${info.chapters.length} 个` : ''}

简介：
${String(info.description ?? '').slice(0, 500)}
`)
