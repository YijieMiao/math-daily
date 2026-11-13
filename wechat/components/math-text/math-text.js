const { paperText } = require('../../data');

const mathPattern = /(\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\[\s\S]|[^$\\])+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/;
let renderer;
const cache = new Map();

function typeset(render, part, fontSize) {
  const display = part.startsWith('$$') || part.startsWith('\\[');
  const delimiters = part.startsWith('$$') || part.startsWith('\\') ? 2 : 1;
  const key = part;
  if (!cache.has(key)) {
    try { cache.set(key, render(part.slice(delimiters, -delimiters), display)); }
    catch { cache.set(key, null); }
    if (cache.size > 300) cache.delete(cache.keys().next().value);
  }
  const math = cache.get(key);
  if (!math) return { text: part };
  const size = Math.min(fontSize, 580 / math.w);
  return {
    text: part, display,
    src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(math.svg),
    style: 'width:' + math.w * size + 'rpx;height:' + math.h * size +
      'rpx;vertical-align:' + -math.depth * size + 'rpx'
  };
}

Component({
  properties: { value: { type: String, value: '' }, fontSize: { type: Number, value: 28 } },
  data: { parts: [] },
  observers: {
    'value, fontSize'(value, fontSize) {
      const parts = paperText(value).split(mathPattern);
      const sequence = this.sequence = (this.sequence || 0) + 1;
      this.setData({ parts: parts.map(text => ({ text })) });
      if (parts.length === 1) return;
      if (!renderer) renderer = require.async('../../formulas/renderer.js').catch(() => { renderer = null; });
      renderer.then(render => {
        if (!render || this.sequence !== sequence) return;
        this.setData({ parts: parts.map((part, i) => i % 2 ? typeset(render, part, fontSize) : { text: part }) });
      });
    }
  },
  methods: {
    imageError(event) {
      this.setData({ ['parts[' + event.currentTarget.dataset.index + '].src']: '' });
    }
  }
});
