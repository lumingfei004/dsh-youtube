# dsh-youtube

**YouTube read-only plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).**

给你的 DSH 助手看油管：搜索视频、看详情、读字幕。**不登录、不点赞、不发评论** —— 只读，零风控。

> 这是只读版。点赞/评论需要 OAuth（YouTube Data API）或 cookie 逆向，风险高，暂不实现。

---

## 它能做什么

| 命令 | 作用 |
|---|---|
| `search <关键词>` | 搜索视频（标题 / 频道 / 时长 / 链接） |
| `video <id\|url>` | 视频详情（播放量 / 发布时间 / 章节 / 简介） |
| `subtitle <id\|url>` | 拉字幕（自动中文 / 英文），输出文本 |

技术栈：[yt-dlp](https://github.com/yt-dlp/yt-dlp)（搜索 / 元数据 / 字幕）+ 一个轻量 DSH 插件壳（设置页 + 配置）。

## 依赖

- **yt-dlp**：`python -m pip install yt-dlp`（或放一个 `yt-dlp.exe` 到 PATH）
- **Python 3.10+**（跑 yt-dlp 用）
- **能访问 YouTube 的网络**（国内需要代理，默认 `http://127.0.0.1:7897`，可在设置页改）

## 安装

```bash
# npm（发布后）
dsh plugin --profile desktop add dsh-youtube-readonly

# 本地开发
dsh plugin --profile desktop add "link:D:\path\to\dsh-youtube"

# 装完重启 DSH，设置里会出现「YouTube」标签页
```

## 配置

设置 → **YouTube**：

- **代理**：访问 YouTube 的 HTTP 代理（留空 = 直连）
- **每次搜索条数**：1–50
- **关注关键词**：一行一个，给日报/生物钟用
- **检查 yt-dlp**：确认依赖可用
- **搜索测试**：直接搜一条验证

配置文件：`~/.dsh/youtube.config.json`

## CLI 用法

```bash
node tools/youtube.mjs search "deepseek harness" --limit 5
node tools/youtube.mjs video DTu4yvmc0Fc
node tools/youtube.mjs subtitle DTu4yvmc0Fc --lines 40
```

## 已知限制

- **只读**：点赞 / 评论需要 OAuth 或 cookie，不在本插件范围（要做请另开分支）
- YouTube 对字幕有频控（429），代码里已加 `--sleep-requests 3`；仍被限流时等几分钟再试
- 代理不可用时所有命令都会失败——先在设置页点「检查 yt-dlp」确认网络

## License

MIT
