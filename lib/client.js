/**
 * dsh-youtube —— 客户端半边：DSH「设置」里的「YouTube」section
 *
 * 数据流：section ⇄ /dsh-youtube/api/* ⇄ ~/.dsh/youtube.config.json
 * 只读版：搜索 / 详情 / 字幕都走 CLI，不写入 YouTube。
 */
window.__ModuleLoader__.load({
  id: "dsh-youtube",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { createElement: h, useCallback, useEffect, useState } = React;

    const API = "/dsh-youtube/api";
    const CSS_TAG = "dsh-youtube/section.css";
    const CSS = [
      ".ytb{max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:6px}",
      ".ytb-title{margin:0;font-size:16px;font-weight:500;line-height:24px}",
      ".ytb-intro{color:var(--dsw-alias-label-tertiary);margin:0 0 4px;font-size:13px;line-height:20px}",
      ".ytb-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px 20px;padding:10px 0;border-bottom:.5px solid var(--dsw-alias-border-l2);flex-wrap:wrap}",
      ".ytb-row:last-child{border-bottom:none}",
      ".ytb-row>div:first-child{flex:1;min-width:190px}",
      ".ytb-label{font-size:13px;line-height:19px}",
      ".ytb-hint{color:var(--dsw-alias-label-tertiary);margin-top:3px;font-size:11.5px;line-height:17px}",
      ".ytb-input{background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font-size:12.5px;height:28px;padding:0 8px;min-width:180px;outline:none}",
      ".ytb-input:focus-visible{border-color:var(--dsw-alias-brand-primary)}",
      ".ytb-input.ytb-wide{min-width:300px}",
      ".ytb-textarea{background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;padding:8px;min-width:320px;min-height:64px;outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}",
      ".ytb-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l2)}",
      ".ytb-btn{background:var(--dsw-alias-brand-primary);color:#fff;border:none;border-radius:6px;font-size:12.5px;height:30px;padding:0 12px;cursor:pointer}",
      ".ytb-btn:disabled{opacity:.5;cursor:default}",
      ".ytb-btn2{background:transparent;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
      ".ytb-out{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary);background:rgba(127,127,127,.08);border-radius:8px;padding:10px 12px;max-height:260px;overflow:auto;margin-top:10px}",
      ".ytb-err{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;margin-top:8px}",
    ].join("");

    const ensureCss = () => {
      if (document.querySelector(`style[data-tag="${CSS_TAG}"]`)) return;
      const el = document.createElement("style");
      el.dataset.tag = CSS_TAG;
      el.textContent = CSS;
      document.head.appendChild(el);
    };

    function Section() {
      const [cfg, setCfg] = useState(null);
      const [busy, setBusy] = useState("");
      const [out, setOut] = useState("");
      const [err, setErr] = useState("");
      const [q, setQ] = useState("");

      useEffect(() => { ensureCss(); }, []);

      const load = useCallback(async () => {
        setErr("");
        try {
          const r = await fetch(`${API}/settings`, { headers: { accept: "application/json" } });
          if (!r.ok) throw new Error(`HTTP ${r.status}${r.status === 403 ? "（被信任栅栏拒绝）" : ""}`);
          const j = await r.json();
          setCfg(j.config);
        } catch (e) {
          setErr(`读取失败：${e.message}`);
        }
      }, []);

      useEffect(() => { load(); }, [load]);

      const setField = (k, v) => setCfg((c) => (c ? { ...c, [k]: v } : c));

      const save = async () => {
        setBusy("save"); setErr(""); setOut("");
        try {
          const r = await fetch(`${API}/settings`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ config: cfg }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
          setCfg(j.config);
          setOut(`✓ 已保存\n配置：${j.configPath ?? "~/.dsh/youtube.config.json"}`);
        } catch (e) {
          setErr(`保存失败：${e.message}`);
        } finally {
          setBusy("");
        }
      };

      const check = async () => {
        setBusy("check"); setErr(""); setOut("检查中…");
        try {
          const r = await fetch(`${API}/check`, { headers: { accept: "application/json" } });
          const j = await r.json();
          setOut(j.ok ? `✓ yt-dlp ${j.ytDlp}\n   Python：${j.python}\n   代理：${j.proxy || "（无）"}` : `✗ yt-dlp 不可用：${j.error}`);
        } catch (e) {
          setErr(`检查失败：${e.message}`);
        } finally {
          setBusy("");
        }
      };

      const test = async () => {
        if (!q.trim()) { setErr("先填一个搜索词"); return; }
        setBusy("test"); setErr(""); setOut("搜索中…");
        try {
          const r = await fetch(`${API}/search?q=${encodeURIComponent(q.trim())}`, { headers: { accept: "application/json" } });
          const j = await r.json();
          if (!j.ok) { setOut(`✗ ${j.error}`); return; }
          setOut(`✓ 搜到 ${j.count} 条\n` + (j.items ?? []).map((it) => `• [${it.id}] ${it.title} — ${it.channel}`).join("\n"));
        } catch (e) {
          setErr(`搜索失败：${e.message}`);
        } finally {
          setBusy("");
        }
      };

      if (!cfg) {
        return h("div", { className: "ytb" },
          h("h3", { className: "ytb-title" }, "YouTube"),
          err ? h("div", { className: "ytb-err" }, err) : h("div", { className: "ytb-hint" }, "读取中…"));
      }

      const kwText = Array.isArray(cfg.keywords) ? cfg.keywords.join("\n") : "";

      return h("div", { className: "ytb" },
        h("h3", { className: "ytb-title" }, "YouTube"),
        h("p", { className: "ytb-intro" }, "只读：搜索、视频详情、字幕。所有请求走下面的代理，不需要登录 YouTube。"),

        h("div", { className: "ytb-row" },
          h("div", null,
            h("div", { className: "ytb-label" }, "代理"),
            h("div", { className: "ytb-hint" }, "访问 YouTube 用的 HTTP 代理；留空 = 直连")),
          h("input", {
            className: "ytb-input ytb-wide", value: cfg.proxy ?? "",
            onChange: (e) => setField("proxy", e.target.value),
            placeholder: "http://127.0.0.1:7897",
          })),

        h("div", { className: "ytb-row" },
          h("div", null,
            h("div", { className: "ytb-label" }, "每次搜索条数"),
            h("div", { className: "ytb-hint" }, "1–50")),
          h("input", {
            className: "ytb-input", type: "number", min: 1, max: 50, value: cfg.maxResults ?? 10,
            onChange: (e) => setField("maxResults", Number(e.target.value) || 10),
          })),

        h("div", { className: "ytb-row" },
          h("div", null,
            h("div", { className: "ytb-label" }, "关注关键词"),
            h("div", { className: "ytb-hint" }, "一行一个；日报/生物钟用这些词搜索")),
          h("textarea", {
            className: "ytb-textarea", value: kwText,
            onChange: (e) => setField("keywords", e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)),
            placeholder: "deepseek harness\nlocal llm",
          })),

        h("div", { className: "ytb-actions" },
          h("button", { className: "ytb-btn", onClick: save, disabled: !!busy }, busy === "save" ? "保存中…" : "保存"),
          h("button", { className: "ytb-btn ytb-btn2", onClick: check, disabled: !!busy }, busy === "check" ? "检查中…" : "检查 yt-dlp"),
          h("button", { className: "ytb-btn ytb-btn2", onClick: load, disabled: !!busy }, "重新读取")),

        h("div", { className: "ytb-row", style: { marginTop: 10, borderBottom: "none" } },
          h("input", {
            className: "ytb-input ytb-wide", value: q,
            onChange: (e) => setQ(e.target.value), placeholder: "搜索测试：输入关键词",
          }),
          h("button", { className: "ytb-btn", onClick: test, disabled: !!busy }, busy === "test" ? "搜索中…" : "搜一下")),

        err ? h("div", { className: "ytb-err" }, err) : null,
        out ? h("div", { className: "ytb-out" }, out) : null,
        h("div", { className: "ytb-hint" }, "先点「检查 yt-dlp」：能读出 2026.x 版本才算可用。"));
    }

    const inject = ["slots"];
    const NS = "dsh-youtube";

    function apply(ctx) {
      ctx.effect(
        () => ctx.slots.inject("settings.section", () =>
          ctx.slots.register(
            { name: "settings.section", id: NS, order: 8, label: () => "YouTube" },
            Section,
          ), "dsh-youtube: settings section"),
        "dsh-youtube: settings section",
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.Section = Section;
    return module.exports;
  },
});
