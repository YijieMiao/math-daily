const api = require('../../data');
const { names, defaults } = require('../../subjects');
const pageSize = 25;
const subjectKey = 'math-daily-subjects';
const aiFilters = ['all', ...Object.keys(api.aiLabels)];

Page({
  data: {
    batches: [], batchLabels: ['最新公告'], batchIndex: 0, date: '',
    subjects: [], subjectOptions: [], editingSubjects: false,
    aiIndex: 0, aiLabels: ['全部 AI 状态', ...Object.values(api.aiLabels)], query: '', savedOnly: false,
    rows: [], count: 0, more: false, loading: false, error: '', offline: false,
    explicit: 0, checked: 0, auditTotal: 0, percent: '—', trendDays: []
  },
  onLoad() {
    const saved = wx.getStorageSync(subjectKey);
    this.setSubjects(Array.isArray(saved) ? saved.filter(code => names[code]) : defaults);
    this.load(0);
    this.loadArchive();
  },
  loadArchive() {
    api.archive().then(batches => {
      const selected = this.data.batches[this.data.batchIndex - 1];
      const batchIndex = selected ? batches.findIndex(item => item.date === selected.date) + 1 : 0;
      this.setData({ batches, batchIndex, batchLabels: ['最新公告', ...batches.map(item => item.date)] });
    });
  },
  onShow() { if (this.papers) this.filter(); },
  async load(index) {
    const sequence = this.sequence = (this.sequence || 0) + 1;
    this.setData({ loading: true, error: '', batchIndex: index, rows: [], count: 0, more: false, date: '', offline: false, trendDays: [] });
    this.papers = [];
    try {
      const data = await api.batch(index ? this.data.batches[index - 1].date : '');
      if (sequence !== this.sequence) return;
      this.papers = data.papers.map(p => ({
        id: p.id, title: api.paperText(p.title), authors: api.paperText(p.authors),
        feeds: p.feeds, revision: String(p.announce_type).includes('replace'),
        search: api.normalize([p.id, p.title, p.authors, p.abstract].join(' ')),
        audit: api.audit(p, data.date, {})
      }));
      this.setData({ date: data.date, offline: !!data.offline });
      this.filter();
      (data.records ? Promise.resolve(data.records) : api.aiRecords(data.offline)).then(records => {
        if (sequence !== this.sequence) return;
        this.papers.forEach((p, i) => { p.audit = api.audit(data.papers[i], data.date, records); });
        this.filter(this.data.rows.length || pageSize);
      });
      api.trends(data.offline).then(trendDays => {
        if (sequence === this.sequence) this.setData({ trendDays: trendDays.slice(-90) });
      }).catch(() => {});
    } catch {
      if (sequence === this.sequence) this.setData({ error: '论文加载失败，请重试。' });
    } finally {
      if (sequence === this.sequence) this.setData({ loading: false });
    }
  },
  setSubjects(subjects) {
    this.setData({ subjects, subjectOptions: Object.keys(names).map(code => ({ code, selected: subjects.includes(code) })) });
  },
  editSubjects() { this.setData({ editingSubjects: !this.data.editingSubjects }); },
  changeSubjects(e) {
    this.setSubjects(e.detail.value);
    try { wx.setStorageSync(subjectKey, this.data.subjects); }
    catch { wx.showToast({ title: '方向仅在本次访问生效', icon: 'none' }); }
    this.filter();
  },
  filter(limit = pageSize) {
    const { subjects, aiIndex, query, savedOnly } = this.data;
    const saved = new Set(api.favorites());
    const selected = new Set(subjects);
    const keyword = api.normalize(query.trim());
    const scope = (this.papers || []).filter(p =>
      p.feeds.some(code => selected.has(code)) && (!savedOnly || saved.has(p.id)) && p.search.includes(keyword));
    const matches = aiIndex ? scope.filter(p => p.audit.status === aiFilters[aiIndex]) : scope;
    const explicit = scope.filter(p => p.audit.status === 'explicit').length;
    const checked = scope.filter(p => ['explicit', 'candidate', 'not_found'].includes(p.audit.status)).length;
    const rows = matches.slice(0, limit).map(({ search, audit, ...p }) => ({ ...p, aiLabel: audit.label, aiStatus: audit.status }));
    this.setData({
      rows, count: matches.length, more: matches.length > limit, explicit, checked, auditTotal: scope.length,
      percent: scope.length ? (100 * explicit / scope.length).toFixed(1) + '%' : '—'
    });
  },
  openPaper(e) {
    const id = e.currentTarget.dataset.id;
    const date = this.data.date;
    if (id && date) wx.navigateTo({ url: '/pages/paper/paper?id=' + encodeURIComponent(id) + '&date=' + encodeURIComponent(date) });
  },
  search(e) { this.setData({ query: e.detail.value }); this.filter(); },
  selectBatch(e) { this.load(Number(e.detail.value)); },
  selectAI(e) { this.setData({ aiIndex: Number(e.detail.value) }); this.filter(); },
  showTrends() { wx.pageScrollTo({ selector: '#trends', duration: 250 }); },
  toggleSaved() { this.setData({ savedOnly: !this.data.savedOnly }); this.filter(); },
  retry() { this.load(this.data.batchIndex); this.loadArchive(); },
  loadMore() { if (this.data.more) this.filter(this.data.rows.length + pageSize); },
  onReachBottom() { this.loadMore(); }
});
