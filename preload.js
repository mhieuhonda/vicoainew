// Cầu nối an toàn giữa giao diện và máy tính: giao diện chỉ gọi được đúng các hàm dưới đây
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vicoDesktop", {
  info: () => ipcRenderer.invoke("app:info"),
  setTheme: (theme) => ipcRenderer.invoke("window:theme", theme),
  previewUrl: (html) => ipcRenderer.invoke("preview:set", html),

  openFolder: () => ipcRenderer.invoke("folder:open"),
  pickFolder: () => ipcRenderer.invoke("folder:pick"),
  setFolder: (root) => ipcRenderer.invoke("folder:set", root),
  listFolder: (rel) => ipcRenderer.invoke("folder:list", rel),
  readFile: (rel) => ipcRenderer.invoke("folder:read", rel),
  reveal: (rel) => ipcRenderer.invoke("folder:reveal", rel),

  // API key chỉ được gửi vào để lưu (mã hoá), giao diện không bao giờ đọc lại được key
  keyStatus: () => ipcRenderer.invoke("keys:status"),
  saveKey: (provider, key) => ipcRenderer.invoke("keys:save", provider, key),
  removeKey: (provider) => ipcRenderer.invoke("keys:remove", provider),
  aiChat: (req) => ipcRenderer.invoke("ai:chat", req),
  aiAbort: (reqId) => ipcRenderer.invoke("ai:abort", reqId),

  // Công cụ cho Agent (giao diện hỏi người dùng trước khi ghi file / chạy lệnh)
  agentWrite: (rel, content) => ipcRenderer.invoke("agent:write", rel, content),
  agentUndo: (checkpoint) => ipcRenderer.invoke("agent:undo", checkpoint),
  agentRun: (command, reqId) => ipcRenderer.invoke("agent:run", command, reqId),
  agentKill: (reqId) => ipcRenderer.invoke("agent:kill", reqId),

  // Model chạy trên máy (Finetune)
  localCatalog: () => ipcRenderer.invoke("local:catalog"),
  localScan: () => ipcRenderer.invoke("local:scan"),
  localStatus: () => ipcRenderer.invoke("local:status"),
  localDownload: (id) => ipcRenderer.invoke("local:download", id),
  localCancel: (id) => ipcRenderer.invoke("local:cancel", id),
  localDelete: (id) => ipcRenderer.invoke("local:delete", id),
  localStart: (id) => ipcRenderer.invoke("local:start", id),
  localStop: () => ipcRenderer.invoke("local:stop"),
  localChat: (req) => ipcRenderer.invoke("local:chat", req),
  localAbort: (reqId) => ipcRenderer.invoke("local:abort", reqId),
  localOpenDir: () => ipcRenderer.invoke("local:openDir"),
  onLocal: (fn) => {
    for (const ch of ["local:progress", "local:status", "local:delta", "local:load"]) ipcRenderer.on(ch, (_e, d) => fn(ch.slice(6), d));
  },

  // Cài đặt desktop, khay hệ thống, cập nhật
  getSettings: () => ipcRenderer.invoke("desktop:settings"),
  setSetting: (key, value) => ipcRenderer.invoke("desktop:set", key, value),
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdateStatus: (fn) => ipcRenderer.on("update:status", (_e, s) => fn(s)),
  onCommand: (fn) => ipcRenderer.on("app:command", (_e, cmd) => fn(cmd)),

  termCwd: () => ipcRenderer.invoke("term:cwd"),
  run: (command) => ipcRenderer.invoke("term:run", command),
  kill: (id) => ipcRenderer.invoke("term:kill", id),
  onTermData: (fn) => ipcRenderer.on("term:data", (_e, d) => fn(d)),
  onTermExit: (fn) => ipcRenderer.on("term:exit", (_e, d) => fn(d)),
});
