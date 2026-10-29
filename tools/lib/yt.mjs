/**
 * yt-dlp 封装：统一走配置里的代理，输出 JSON。
 */
import { execFile } from 'node:child_process'
import { config } from './config.mjs'

const PY = process.env.YTDLP_PY || 'E:\\py\\python.exe'

/** 跑 yt-dlp，返回 stdout */
export function ytDlp(args, { timeout = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const c = config()
    const full = ['-m', 'yt_dlp', ...args, '--no-warnings']
    if (c.proxy) full.push('--proxy', c.proxy)
    execFile(PY, full, {
      timeout,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(String(stderr || err.message).trim().slice(-800)))
        return
      }
      resolve(String(stdout ?? ''))
    })
  })
}

/** 搜索：ytsearchN:query，flat 模式（不解析每个视频） */
export async function search(query, n = 10) {
  const out = await ytDlp([`ytsearch${Math.max(1, Math.min(50, n))}:${query}`, '--dump-json', '--flat-playlist'])
  return out.trim().split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
}

/** 单个视频的完整元数据 */
export async function videoInfo(url) {
  const out = await ytDlp([url, '--dump-json', '--skip-download'], { timeout: 180_000 })
  return JSON.parse(out.trim().split('\n')[0])
}

/** 下载字幕（vtt），返回本地文件路径。YouTube 对字幕有频控，必须带延迟 */
export async function downloadSubs(url, outDir, langs = 'en.*,zh.*') {
  await ytDlp([
    url,
    '--skip-download',
    '--write-subs', '--write-auto-subs',
    '--sub-langs', langs,
    '--sub-format', 'vtt',
    '--convert-subs', 'vtt',
    '--sleep-requests', '3',
    '--retries', '3',
    '--ignore-errors',
    '--output', '%(id)s.%(ext)s',
    '-P', outDir,
  ], { timeout: 240_000 })
  return outDir
}
