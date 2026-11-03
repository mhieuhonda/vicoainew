/* =========================================================
   LƯU FILE LỚN - Vico AI
   Ảnh, PDF đính kèm và tài liệu dự án lưu trong IndexedDB của trình duyệt
   (localStorage chỉ chứa được vài MB). Khi có máy chủ, thay phần thân
   các hàm dưới đây bằng gọi API lưu trữ, giữ nguyên tên hàm.
   ========================================================= */
const VicoDB = (() => {
  let opening;
  const open = () => opening || (opening = new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("Trình duyệt không hỗ trợ lưu file"));
    const req = indexedDB.open("vico-ai", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");          // file đính kèm: id -> Blob
      if (!db.objectStoreNames.contains("projectDocs")) db.createObjectStore("projectDocs"); // dự án: id -> [{name,size,text}]
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
  async function run(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Lưu thất bại (có thể bộ nhớ đã đầy)"));
    });
  }
  return {
    put: (store, key, value) => run(store, "readwrite", (s) => s.put(value, key)),
    get: (store, key) => run(store, "readonly", (s) => s.get(key)),
    del: (store, key) => run(store, "readwrite", (s) => s.delete(key)),
  };
})();
