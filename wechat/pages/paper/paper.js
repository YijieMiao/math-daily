const api = require('../../data');

Page({
  data: { loading: true, paper: null, audit: null, saved: false, openingPdf: false, error: '' },
  onLoad(options) {
    try { this.id = decodeURIComponent(options.id || ''); }
    catch { this.id = ''; }
    this.date = options.date || '';
    this.load();
  },
  async load() {
    this.setData({ loading: true, error: '', paper: null, audit: null });
    try {
      if (!/^[\w.\/-]{1,80}$/.test(this.id) || !/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
        throw new Error('论文链接无效');
      }
      const data = await api.batch(this.date);
      const paper = data.papers.find(item => item.id === this.id);
      if (!paper) throw new Error('未找到论文');
      this.setData({
        paper: { ...paper, title: api.paperText(paper.title), authors: api.paperText(paper.authors), abstract: api.paperText(paper.abstract) },
        saved: api.favorites().includes(this.id),
        audit: api.audit(paper, this.date, {})
      });
      api.aiRecords(data.offline).then(records => this.setData({ audit: api.audit(paper, this.date, records) }));
    } catch (error) {
      this.setData({ error: '无法读取这篇论文，请重试。' });
    } finally {
      this.setData({ loading: false });
    }
  },
  toggleSaved() {
    const saved = new Set(api.favorites());
    const next = !saved.has(this.id);
    if (next) saved.add(this.id);
    else saved.delete(this.id);
    try {
      wx.setStorageSync('math-daily-favorites', [...saved]);
      this.setData({ saved: next });
    } catch {
      wx.showToast({ title: '收藏保存失败', icon: 'none' });
    }
  },
  async openPdf() {
    const url = this.data.paper && this.data.paper.pdf;
    if (!url || this.data.openingPdf) return;
    this.setData({ openingPdf: true });
    try {
      const download = await new Promise((resolve, reject) => {
        wx.downloadFile({ url, success: resolve, fail: reject });
      });
      if (download.statusCode !== 200 || !download.tempFilePath) throw new Error('PDF 下载失败');
      await new Promise((resolve, reject) => {
        wx.openDocument({ filePath: download.tempFilePath, fileType: 'pdf', showMenu: true, success: resolve, fail: reject });
      });
    } catch {
      wx.showModal({
        title: '暂时无法打开 PDF',
        content: '你可以复制这篇论文的 PDF 链接，在浏览器中打开。',
        confirmText: '复制链接',
        success(result) {
          if (result.confirm) wx.setClipboardData({ data: url });
        }
      });
    } finally {
      this.setData({ openingPdf: false });
    }
  },
  copyAudit() { wx.setClipboardData({ data: this.data.audit.source_url }); },
  copyArxiv() { wx.setClipboardData({ data: this.data.paper.url }); },
  copyWeb() { wx.setClipboardData({ data: api.base + '?paper=' + encodeURIComponent(this.id) }); },
  onShareAppMessage() {
    return {
      title: this.data.paper ? this.data.paper.title : 'Math Daily',
      path: '/pages/paper/paper?id=' + encodeURIComponent(this.id) + '&date=' + encodeURIComponent(this.date)
    };
  }
});
