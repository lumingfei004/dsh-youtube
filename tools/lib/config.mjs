/**
 * YouTube 只读插件的配置层。
 * 配置：~/.dsh/youtube.config.json（不存在时用默认值）
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HOME = process.env.USERPROFILE || os.homedir()
export const CFG_DIR = path.join(HOME, '.dsh')
export const CFG_FILE = path.join(CFG_DIR, 'youtube.config.json')

export const DEFAULTS = {
  proxy: 'http://127.0.0.1:7897',
  keywords: [],
  maxResults: 10,
  lang: 'zh',
}

export function config() {
  let raw = {}
  try { raw = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) } catch { /* 默认值 */ }
  return { ...DEFAULTS, ...raw }
}

export function saveConfig(patch) {
  const cur = config()
  const next = { ...cur, ...patch }
  fs.mkdirSync(CFG_DIR, { recursive: true })
  fs.writeFileSync(CFG_FILE, JSON.stringify(next, null, 2) + '\n')
  return next
}
