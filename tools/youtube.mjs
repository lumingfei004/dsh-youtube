#!/usr/bin/env node
// dsh-youtube 只读版 CLI 入口
// 用法：node youtube.mjs <search|video|subtitle> ...
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const CMDS = {
  search: ['commands/search.mjs', '搜索视频：<关键词> [--limit N] [--json]'],
  video: ['commands/video.mjs', '视频详情：<video_id|url> [--json]'],
  subtitle: ['commands/subtitle.mjs', '字幕：<video_id|url> [--lang zh.*,en.*] [--lines 40]'],
}

const [cmd, ...rest] = process.argv.slice(2)

if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log('dsh-youtube（只读）\n')
  for (const [name, [, desc]] of Object.entries(CMDS)) console.log(`  ${name.padEnd(10)} ${desc}`)
  console.log('\n需要代理访问 YouTube（默认 http://127.0.0.1:7897，可在 ~/.dsh/youtube.config.json 改）')
  process.exit(0)
}

const entry = CMDS[cmd]
if (!entry) {
  console.error(`未知命令：${cmd}`)
  process.exit(2)
}

process.argv = [process.argv[0], process.argv[1], ...rest]
await import(pathToFileURL(path.join(HERE, entry[0])).href)
