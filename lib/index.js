/**
 * dsh-youtube —— 宿主侧插件（设置壳，只读版）
 *
 * 路由：
 *   GET/POST /dsh-youtube/api/settings   读/写 ~/.dsh/youtube.config.json
 *   GET      /dsh-youtube/api/check      yt-dlp 可用性检查
 *   GET      /dsh-youtube/api/search?q=  搜索测试（走 CLI）
 *
 * 所有路由都过信任栅栏（回环 + connection.requestRejection）。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const HOME = process.env.USERPROFILE || os.homedir()
const DSH_HOME = process.env.DSH_HOME || path.join(HOME, '.dsh')
const CFG_FILE = process.env.DSH_YOUTUBE_CONFIG || path.join(DSH_HOME, 'youtube.config.json')
const TOOLS = path.join(HERE, '..', 'tools', 'youtube.mjs')
const PY = process.env.YTDLP_PY || 'E:\\py\\python.exe'

const NODE_EXE = (() => {
  const cands = [
    process.env.DSH_NODE,
    path.join(DSH_HOME, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'node', 'bin', 'node.exe'),
    process.execPath,
  ]
  for (const c of cands) {
    try { if (c && fs.existsSync(c)) return c } catch { /* 忽略 */ }
  }
  return process.execPath
})()

const DEFAULTS = {
  proxy: 'http://127.0.0.1:7897',
  keywords: [],
  maxResults: 10,
  lang: 'zh',
}

const clone = (o) => JSON.parse(JSON.stringify(o))
function merge(base, over) {
  const out = { ...base }
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base[k] ?? {}, v) : v
  }
  return out
}

function readConfig() {
  let user = {}
  try { user = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) } catch { /* 默认 */ }
  return { ...merge(DEFAULTS, user), __hasUserFile: Object.keys(user).length > 0 }
}

function writeConfig(next) {
  fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true })
  fs.writeFileSync(CFG_FILE, JSON.stringify(next, null, 2) + '\n')
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function isLoopbackReq(req) {
  const h = String(req.headers?.host ?? '').toLowerCase().split(':')[0]
  return h === '127.0.0.1' || h === 'localhost' || h === '[::1]' || h === '::1'
}

function run(cmd, args, timeout = 120_000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: String(stdout ?? '').trim(), err: String(stderr ?? '').trim() })
    })
  })
}

export default {
  name: 'dsh-youtube-readonly',
  inject: ['webServer', 'connection'],
  apply(ctx) {
    function rejected(req, res, { strict = true } = {}) {
      if (!isLoopbackReq(req)) {
        json(res, 403, { ok: false, error: '只接受本机回环访问' })
        return true
      }
      try {
        const conn = ctx.get('connection') || ctx.connection
        if (!conn || typeof conn.requestRejection !== 'function') {
          if (strict) { json(res, 503, { ok: false, error: '信任栅栏不可用，拒绝访问' }); return true }
          return false
        }
        const code = conn.requestRejection(req)
        if (code === undefined || code === null || code === false) return false
        res.statusCode = typeof code === 'number' ? code : 403
        res.end()
        return true
      } catch {
        if (strict) { json(res, 503, { ok: false, error: '信任栅栏异常，拒绝访问' }); return true }
        return false
      }
    }

    const disposers = []
    function route(kind, pathname, handler) {
      disposers.push(ctx.webServer.register({
        kind,
        path: pathname,
        handler: async (req, res) => {
          if (rejected(req, res)) return
          try { await handler(req, res) } catch (err) {
            try { json(res, 500, { ok: false, error: String(err?.message ?? err) }) } catch { /* 忽略 */ }
          }
        },
      }))
    }

    route('exact', '/dsh-youtube/api/settings', async (req, res) => {
      if (req.method === 'GET') {
        json(res, 200, { ok: true, config: readConfig(), configPath: CFG_FILE })
        return
      }
      if (req.method !== 'POST') { json(res, 405, { ok: false }); return }
      const body = JSON.parse((await readBody(req)) || '{}')
      const incoming = body?.config && typeof body.config === 'object' ? body.config : body
      const cur = readConfig()
      delete cur.__hasUserFile
      const filtered = {}
      for (const k of ['proxy', 'keywords', 'maxResults', 'lang']) {
        if (incoming && incoming[k] !== undefined) filtered[k] = incoming[k]
      }
      const next = merge(cur, filtered)
      if (!Array.isArray(next.keywords)) next.keywords = []
      next.maxResults = Math.min(50, Math.max(1, Number(next.maxResults) || 10))
      writeConfig(next)
      json(res, 200, { ok: true, config: next, configPath: CFG_FILE })
    })

    route('exact', '/dsh-youtube/api/check', async (req, res) => {
      const ver = await run(PY, ['-m', 'yt_dlp', '--version'], 30_000)
      json(res, 200, {
        ok: ver.ok,
        ytDlp: ver.ok ? ver.out.split('\n')[0] : '',
        error: ver.ok ? '' : (ver.err || ver.out).slice(0, 300),
        python: PY,
        proxy: readConfig().proxy,
      })
    })

    route('exact', '/dsh-youtube/api/search', async (req, res) => {
      const u = new URL(req.url ?? '/', 'http://127.0.0.1')
      const q = u.searchParams.get('q') ?? ''
      if (!q) { json(res, 400, { ok: false, error: '缺少 q 参数' }); return }
      const r = await run(NODE_EXE, [TOOLS, 'search', q, '--limit', '5', '--json'], 150_000)
      if (!r.ok) { json(res, 200, { ok: false, error: (r.err || r.out).slice(0, 400) }); return }
      let rows = []
      try { rows = JSON.parse(r.out) } catch { /* 解析失败 */ }
      json(res, 200, { ok: true, count: rows.length, items: rows.slice(0, 5).map((x) => ({ id: x.id, title: x.title, channel: x.channel ?? x.uploader ?? '' })) })
    })

    ctx.effect(() => () => {
      for (const d of disposers) { try { d() } catch { /* 忽略 */ } }
    })

    try { console.log(`[dsh-youtube] 设置页已挂载：/dsh-youtube/api/ · 配置 ${CFG_FILE}`) } catch { /* 忽略 */ }
  },
}
