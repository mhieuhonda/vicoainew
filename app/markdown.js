/* =========================================================
   HIỂN THỊ MARKDOWN - Vico AI
   Tiêu đề, danh sách (lồng nhau, checklist), bảng, trích dẫn, link,
   code có tô màu (highlight.js), công thức toán (KaTeX), ô file AI gửi.
   ========================================================= */
const renderMarkdown = (() => {
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LIST_RE = /^\s*([-*+]|\d+[.)])\s+/;
  const indentOf = (l) => l.replace(/\t/g, "    ").match(/^ */)[0].length;

  function highlight(code, lang) {
    if (window.hljs && lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value; } catch {}
    }
    return esc(code);
  }
  function tex(src, display) {
    if (window.katex) {
      try { return katex.renderToString(src, { displayMode: display, throwOnError: false, output: "html" }); } catch {}
    }
    return `<code>${esc(src)}</code>`;
  }

  return function renderMarkdown(text) {
    const slots = [];
    const hold = (html) => `\u0000${slots.push(html) - 1}\u0000`;
    let s = String(text || "");
    // Khối code chưa đóng (đang chạy chữ) -> tạm đóng để hiển thị gọn
    if ((s.match(/```/g) || []).length % 2) s += "\n```";

    // 1. Khối code / file (giữ nội dung gốc, chưa escape)
    s = s.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_, info, code) => {
      const { lang, file } = parseFence(esc(info));
      code = code.replace(/\n$/, "");
      return "\n" + hold(file
        ? fileTile(safeFileName(file), code)
        : `<pre${lang ? ` data-lang="${esc(lang)}"` : ""}><code class="hljs">${highlight(code, lang)}</code></pre>`) + "\n";
    });
    // 2. Code trong dòng và công thức toán
    s = s.replace(/`([^`\n]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`));
    s = s.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => "\n" + hold(`<div class="math-block">${tex(a || b, true)}</div>`) + "\n");
    s = s.replace(/\\\((.+?)\\\)/g, (_, a) => hold(`<span class="math-inline">${tex(a, false)}</span>`));
    // $...$: sau $ mở không có khoảng trắng, trước $ đóng không có khoảng trắng, $ đóng không dính số (tránh nhầm "$5 và $10")
    s = s.replace(/(^|[^\\$\w])\$(?!\s)([^$\n]*?[^\s\\$])\$(?!\d)/g, (all, pre, a) =>
      /[à-ỹđ]/i.test(a) ? all : pre + hold(`<span class="math-inline">${tex(a, false)}</span>`)); // có chữ tiếng Việt -> không phải công thức

    // 3. Escape phần còn lại rồi dựng các khối
    const html = blocks(esc(s).split("\n"));
    return html.replace(/<p>\u0000(\d+)\u0000<\/p>|\u0000(\d+)\u0000/g, (_, a, b) => slots[a ?? b]);

    function inline(t) {
      t = t.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_, label, url) => hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`));
      t = t.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+[^\s<.,;:!?)\]'"])/g, (_, pre, url) => pre + hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`));
      return t
        .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
    }
    function isTable(lines, i) {
      return lines[i].includes("|") && i + 1 < lines.length &&
        /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1]);
    }
    function isBlockStart(lines, i) {
      const l = lines[i];
      return /^#{1,6}\s/.test(l) || /^\s*([-*_])(\s*\1){2,}\s*$/.test(l) || /^&gt;/.test(l) ||
        LIST_RE.test(l) || isTable(lines, i) || /^\s*\u0000\d+\u0000\s*$/.test(l);
    }
    function cells(row) {
      return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    }
    function table(lines, i) {
      const head = cells(lines[i]);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : ""));
      const td = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ""}>${inline(c)}</${tag}>`;
      let out = `<div class="md-table"><table><thead><tr>${head.map((c, k) => td("th", c, k)).join("")}</tr></thead><tbody>`;
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        out += `<tr>${cells(lines[i]).map((c, k) => td("td", c, k)).join("")}</tr>`;
        i++;
      }
      return [out + "</tbody></table></div>", i];
    }
    function list(lines, i) {
      const base = indentOf(lines[i]);
      const ordered = /^\s*\d+[.)]/.test(lines[i]);
      const start = ordered ? parseInt(lines[i], 10) : 1;
      let out = ordered ? `<ol${start !== 1 ? ` start="${start}"` : ""}>` : "<ul>";
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
          if (i + 1 < lines.length && LIST_RE.test(lines[i + 1]) && indentOf(lines[i + 1]) >= base) { i++; continue; }
          break;
        }
        const m = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
        const ind = indentOf(line);
        if (m && ind === base && /^\s*\d+[.)]/.test(line) !== ordered) break; // đổi kiểu danh sách -> danh sách mới
        if (m && ind === base) {
          let content = m[1], inner = "";
          i++;
          while (i < lines.length && lines[i].trim() && indentOf(lines[i]) > base) {
            if (LIST_RE.test(lines[i])) { const [sub, ni] = list(lines, i); inner += sub; i = ni; }
            else content += "\n" + lines[i++].trim();
          }
          const task = content.match(/^\[([ xX])\]\s+([\s\S]*)$/);
          out += task
            ? `<li class="task"><input type="checkbox" disabled${task[1] !== " " ? " checked" : ""} /> ${inline(task[2]).replace(/\n/g, "<br>")}${inner}</li>`
            : `<li>${inline(content).replace(/\n/g, "<br>")}${inner}</li>`;
        } else if (m && ind > base) {
          const [sub, ni] = list(lines, i);
          out += sub;
          i = ni;
        } else break;
      }
      return [out + (ordered ? "</ol>" : "</ul>"), i];
    }
    function blocks(lines) {
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        let m;
        if (!line.trim()) { i++; continue; }
        if (/^\s*\u0000\d+\u0000\s*$/.test(line)) { out.push(line.trim()); i++; continue; }
        if ((m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push("<hr />"); i++; continue; }
        if (/^&gt;/.test(line)) {
          const buf = [];
          while (i < lines.length && /^&gt;/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, ""));
          out.push(`<blockquote>${blocks(buf)}</blockquote>`);
          continue;
        }
        if (isTable(lines, i)) { const [h, ni] = table(lines, i); out.push(h); i = ni; continue; }
        if (LIST_RE.test(line)) { const [h, ni] = list(lines, i); out.push(h); i = ni; continue; }
        const buf = [];
        while (i < lines.length && lines[i].trim() && (!buf.length || !isBlockStart(lines, i))) buf.push(lines[i++]);
        out.push(`<p>${inline(buf.join("\n")).replace(/\n/g, "<br>")}</p>`);
      }
      return out.join("");
    }
  };
})();
