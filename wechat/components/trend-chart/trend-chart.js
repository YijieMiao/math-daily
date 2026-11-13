const palette = ['#a54660', '#368a86', '#af7b24', '#5d80b4', '#8c6bb0', '#426a47', '#935039', '#655990'];

function weekStart(date) {
  const day = new Date(date + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}

Component({
  properties: { days: Array, subjects: Array },
  data: { weekly: false, ai: false, hidden: [], legend: [], summary: '' },
  observers: { 'days, subjects, weekly, ai, hidden'() { this.draw(); } },
  lifetimes: { ready() { this.draw(); } },
  methods: {
    period() { this.setData({ weekly: !this.data.weekly }); },
    metric() { this.setData({ ai: !this.data.ai }); },
    toggle(e) {
      const code = e.currentTarget.dataset.code;
      const hidden = this.data.hidden;
      this.setData({ hidden: hidden.includes(code) ? hidden.filter(value => value !== code) : [...hidden, code] });
    },
    draw() {
      const { days, subjects, weekly, ai, hidden } = this.data;
      const legend = subjects.map((code, i) => ({ code, color: palette[i % palette.length], enabled: !hidden.includes(code) }));
      const active = legend.filter(s => s.enabled);
      const grouped = new Map();
      for (const day of days) {
        const date = weekly ? weekStart(day.date) : day.date;
        if (!grouped.has(date)) grouped.set(date, {});
        const group = grouped.get(date);
        for (const { code } of active) {
          const raw = day.groups[code];
          if (!raw) continue;
          if (!group[code]) group[code] = { count: 0, explicit: 0, checked: 0 };
          const value = group[code];
          value.count += raw.new;
          value.explicit += raw.new_explicit || 0;
          value.checked += raw.new_checked || 0;
        }
      }
      const rows = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
      const value = raw => !raw ? null : ai ? raw.checked && raw.count ? 100 * raw.explicit / raw.count : null : raw.count;
      const latest = rows[rows.length - 1];
      const summary = latest && active.length ? latest[0] + (weekly ? ' 当周 · ' : ' · ') + active.map(({ code }) => {
        const v = value(latest[1][code]);
        return code + ' ' + (v === null ? '—' : ai ? v.toFixed(1) + '%' : v + ' 篇');
      }).join('　') : '';
      this.setData({ legend, summary }, () => {
        if (!rows.length || !active.length) return;
        this.createSelectorQuery().select('.plot').fields({ node: true, size: true }).exec(([result]) => {
          if (!result || !result.node || !result.width) return;
          const { node, width, height } = result;
          const ratio = wx.getWindowInfo().pixelRatio;
          node.width = width * ratio;
          node.height = height * ratio;
          const ctx = node.getContext('2d');
          ctx.scale(ratio, ratio);
          const max = ai ? 100 : Math.max(4, Math.ceil(Math.max(...rows.flatMap(([, group]) => active.map(s => value(group[s.code]) || 0))) / 4) * 4);
          const left = 38, right = width - 17, bottom = height - 26, top = 12;
          const timestamps = rows.map(([date]) => Date.parse(date + 'T00:00:00Z'));
          const span = timestamps[timestamps.length - 1] - timestamps[0];
          const x = i => span ? left + (right - left) * (timestamps[i] - timestamps[0]) / span : (left + right) / 2;
          const y = v => bottom - (bottom - top) * v / max;
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#58665f';
          ctx.strokeStyle = '#e0e6dd';
          ctx.textAlign = 'right';
          for (let i = 0; i <= 4; i++) {
            const v = max * i / 4;
            ctx.fillText(v + (ai ? '%' : ''), left - 5, y(v) + 3);
            ctx.beginPath();
            ctx.moveTo(left, y(v));
            ctx.lineTo(right, y(v));
            ctx.stroke();
          }
          ctx.textAlign = 'center';
          for (const i of new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])) {
            if (i === 0 || i === rows.length - 1 || (x(i) - left > 35 && right - x(i) > 35)) {
              ctx.fillText(rows[i][0].slice(5), x(i), height - 7);
            }
          }
          for (const s of active) {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 1.7;
            let connected = false;
            const points = [];
            rows.forEach(([, group], i) => {
              const v = value(group[s.code]);
              if (v === null) { connected = false; return; }
              const point = [x(i), y(v)];
              if (connected) ctx.lineTo(...point);
              else ctx.moveTo(...point);
              points.push(point);
              connected = true;
            });
            ctx.stroke();
            ctx.fillStyle = s.color;
            for (const [px, py] of points) {
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });
      });
    }
  }
});
