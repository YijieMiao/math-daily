const base = 'https://yijiemiao.github.io/math-daily/';
const dataBase = base + 'data/';

const snapshot = require('./snapshot');
const extras = require('./snapshot-extras');
const batches = new Map();
const localArchive = require('./archive-local');
const { gunzipSync, strFromU8 } = require('./vendor/inflate');
let remoteRecords;

function aiRecords(offline) {
  if (offline) return Promise.resolve(extras.records);
  if (!remoteRecords) remoteRecords = request('ai-disclosures.json').then(data => data.records || {}).catch(() => {
    remoteRecords = null;
    return extras.records;
  });
  return remoteRecords;
}
const aiLabels = {
  explicit: '检出 AI 使用声明', candidate: 'AI 相关表述待核对',
  not_found: '已检索未发现 AI 披露', pending: 'AI 披露尚未核查', unavailable: 'AI 核查未完成'
};
function audit(paper, date, records) {
  const record = records[paper.id];
  if (!record || record.announcement_date !== date ||
      (/v\d+$/.test(paper.version_id || '') && record.version_id && paper.version_id !== record.version_id)) {
    return { status: 'pending', label: aiLabels.pending };
  }
  return { ...record, label: aiLabels[record.status] || aiLabels.pending };
}
function trends(offline) {
  return offline ? Promise.resolve(extras.days) : request('trends.json').then(data => data.days || []);
}

function request(path) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: dataBase + path,
      timeout: 5000,
      success(res) {
        if (res.statusCode === 200 && res.data && typeof res.data === 'object') resolve(res.data);
        else reject(new Error('数据不可用'));
      },
      fail: reject
    });
  });
}

async function archive() {
  try {
    const index = await request('archive.json');
    if (Array.isArray(index) && index.length) return index;
  } catch {}
  return localArchive.index;
}

function cacheBatch(data) {
  batches.set(data.date, data);
  if (batches.size > 3) batches.delete(batches.keys().next().value);
  return data;
}

async function batch(date) {
  if (date && batches.has(date)) return batches.get(date);
  try {
    const data = await request(date ? 'archive/' + date + '.json' : 'latest.json');
    if (!Array.isArray(data.papers) || !data.date) throw new Error('论文数据格式不正确');
    return cacheBatch(data);
  } catch (error) {
    if (!date || date === snapshot.date) {
      return cacheBatch({ ...snapshot, offline: true, records: extras.records });
    }
    const load = localArchive.loaders[date];
    if (!load) throw error;
    const payload = await load();
    const bytes = new Uint8Array(wx.base64ToArrayBuffer(payload));
    const local = JSON.parse(strFromU8(gunzipSync(bytes)));
    return cacheBatch({ ...local.batch, offline: true, records: local.records });
  }
}

function paperText(value) {
  const accents = {"'": '\u0301', '`': '\u0300', '"': '\u0308', '^': '\u0302', '~': '\u0303', '=': '\u0304', '.': '\u0307', c: '\u0327', v: '\u030c'};
  const math = /(\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\[\s\S]|[^$\\])*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/;
  return value.split(math).map((part, i) => i % 2 ? part : part.replace(
    /\{\\(['`"^~=.]|[cv])\s*(?:\{([A-Za-z])\}|([A-Za-z]))\}|\\(['`"^~=.]|[cv](?=[\s{]))\s*(?:\{([A-Za-z])\}|([A-Za-z]))/g,
    (_, groupedAccent, groupedBraced, groupedLetter, accent, braced, letter) =>
      ((groupedBraced || groupedLetter || braced || letter) + accents[groupedAccent || accent]).normalize('NFC')
  )).join('');
}
function normalize(value) { return paperText(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[{}\\$]/g,'').toLowerCase(); }

function favorites() {
  const saved = wx.getStorageSync('math-daily-favorites');
  return Array.isArray(saved) ? saved : [];
}

module.exports = { base, request, archive, batch, paperText, normalize, favorites, aiRecords, aiLabels, audit, trends };
