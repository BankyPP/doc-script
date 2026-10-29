// ดึงรายการ "แก้/เพิ่ม/ลบในเว็บ ที่ยังไม่เข้าไฟล์ Google" จาก Firestore (อ่านได้สาธารณะ) → edits/pending.json
// ใช้กับคำสั่ง //update ggfile reverse all — Claude อ่านไฟล์นี้แล้วลอกเข้าไฟล์ [AI] ผ่าน Google connector
import fs from 'node:fs';
const P = 'ac-mdcu', KEY = 'AIzaSyDIzd81Qw7shAOj3uiGU1T8tm90HXtF4yg';
const base = `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents/`;
function val(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return +v.integerValue;
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  if ('mapValue' in v) return obj(v.mapValue.fields || {});
  return null;
}
function obj(f) { const o = {}; for (const k in f) o[k] = val(f[k]); return o; }
async function all(col) {
  let out = [], tok = '';
  do {
    const r = await fetch(base + col + '?pageSize=300&key=' + KEY + (tok ? '&pageToken=' + tok : ''));
    if (!r.ok) throw new Error(col + ' HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300));
    const j = await r.json();
    (j.documents || []).forEach(d => out.push(Object.assign({ id: d.name.split('/').pop() }, obj(d.fields || {}))));
    tok = j.nextPageToken || '';
  } while (tok);
  return out;
}
const edits = (await all('poymor_edit')).filter(e => e.h != null && e.sync && e.sync.st !== 'ok' && e.sync.st !== 'notai')
  .map(e => ({ key: e.k, by: e.name, at: e.at, status: e.sync.st, msg: e.sync.msg || '', target: e.sync.tg, ops: e.sync.ops || [] }));
const struct = (await all('poymor_struct')).filter(x => x.st !== 'ok' && x.st !== 'web' && x.st !== 'notai')
  .map(x => ({ id: x.id, act: x.act, by: x.byName, at: x.at, status: x.st, msg: x.msg || '', title: x.title, name: x.name, ppath: x.ppath, path: x.path, row: x.row, vals: x.vals }));
const out = { at: new Date().toISOString(), edits, struct };
fs.mkdirSync('edits', { recursive: true });
fs.writeFileSync('edits/pending.json', JSON.stringify(out, null, 1));
console.log('edits', edits.length, 'struct', struct.length);
