// Values follow the existing measurement: 0 at the end, 1 at the start.
export const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.65, 0.786, 1];

export function fibonacciLevels(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0 || start === end) return [];
  return FIB_RATIOS.map(ratio => ({ ratio, price: end + (start - end) * ratio }));
}

export class FibonacciOverlay {
  constructor(series) {
    this.series = series;
    this.levels = [];
    this.formatPrice = String;
    this.views = [
      { zOrder: () => 'bottom', renderer: () => ({ draw: target => this.drawBands(target) }) },
      { zOrder: () => 'top', renderer: () => ({ draw: target => this.drawLabels(target) }) }
    ];
  }

  attached({ requestUpdate }) { this.requestUpdate = requestUpdate; }
  detached() { this.requestUpdate = undefined; }
  paneViews() { return this.views; }

  setLevels(levels, formatPrice) {
    this.levels = levels;
    this.formatPrice = formatPrice;
    this.requestUpdate?.();
  }

  drawBands(target) {
    if (!this.levels.length) return;
    const coordinate = ratio => {
      const level = this.levels.find(item => item.ratio === ratio);
      return level ? this.series.priceToCoordinate(level.price) : null;
    };
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      for (const band of [
        { from: 0.5, to: 0.618, color: 'rgba(239, 190, 71, 0.15)' },
        { from: 0.618, to: 0.65, color: 'rgba(211, 76, 69, 0.26)' },
        { from: 0.65, to: 0.786, color: 'rgba(239, 190, 71, 0.15)' }
      ]) {
        const first = coordinate(band.from), second = coordinate(band.to);
        if (first == null || second == null) continue;
        context.fillStyle = band.color;
        context.fillRect(0, Math.min(first, second), mediaSize.width, Math.abs(second - first));
      }
      for (const level of this.levels) {
        const y = this.series.priceToCoordinate(level.price);
        if (y == null || y < 0 || y > mediaSize.height) continue;
        const golden = level.ratio === 0.618 || level.ratio === 0.65;
        context.beginPath();
        context.strokeStyle = golden ? 'rgba(169, 48, 48, 0.95)' : 'rgba(112, 83, 137, 0.76)';
        context.lineWidth = golden ? 1.5 : 1;
        context.moveTo(0, Math.round(y) + 0.5);
        context.lineTo(mediaSize.width, Math.round(y) + 0.5);
        context.stroke();
      }
    });
  }

  drawLabels(target) {
    if (!this.levels.length) return;
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      const rows = this.levels.map(level => ({ ...level, y: this.series.priceToCoordinate(level.price) }))
        .filter(level => level.y != null && level.y >= 0 && level.y <= mediaSize.height)
        .sort((a, b) => a.y - b.y);
      const spacing = 21;
      const top = 12, bottom = mediaSize.height - 34;
      for (let i = 0; i < rows.length; i++) rows[i].labelY = Math.max(top, rows[i].y, i ? rows[i - 1].labelY + spacing : top);
      if (rows.length && rows.at(-1).labelY > bottom) {
        rows.at(-1).labelY = bottom;
        for (let i = rows.length - 2; i >= 0; i--) rows[i].labelY = Math.min(rows[i].labelY, rows[i + 1].labelY - spacing);
      }
      context.font = '600 11px Inter, Segoe UI, sans-serif';
      context.textBaseline = 'middle';
      for (const row of rows) {
        const golden = row.ratio === 0.618 || row.ratio === 0.65;
        const label = `${String(row.ratio).replace('.', ',')}  ·  ${this.formatPrice(row.price)}`;
        const width = Math.ceil(context.measureText(label).width) + 16;
        const x = 7, y = row.labelY - 9;
        context.fillStyle = golden ? 'rgba(255, 244, 241, 0.97)' : 'rgba(255, 255, 255, 0.95)';
        context.fillRect(x, y, width, 18);
        context.strokeStyle = golden ? '#c8584b' : '#cabbd4';
        context.lineWidth = 1;
        context.strokeRect(x + 0.5, y + 0.5, width, 18);
        context.fillStyle = golden ? '#9b322c' : '#60436f';
        context.fillText(label, x + 8, row.labelY);
        if (Math.abs(row.labelY - row.y) > 2) {
          context.beginPath();
          context.strokeStyle = golden ? '#c8584b' : '#a992b6';
          context.moveTo(x + width, row.labelY);
          context.lineTo(x + width + 7, row.y);
          context.stroke();
        }
      }
    });
  }
}
