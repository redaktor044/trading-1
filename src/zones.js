// Lightweight Charts drawing primitive. Coordinates follow the chart on zoom and pan.
export class Zones {
  constructor(chart, series) {
    this.chart = chart;
    this.series = series;
    this.zones = [];
    this.views = [{ zOrder: () => 'bottom', renderer: () => this }];
  }

  attached({ requestUpdate }) { this.requestUpdate = requestUpdate; }
  detached() { this.requestUpdate = undefined; }
  paneViews() { return this.views; }
  setZones(zones) { this.zones = zones; this.requestUpdate?.(); }

  draw(target) {
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      for (const zone of this.zones) {
        const top = this.series.priceToCoordinate(zone.high);
        const bottom = this.series.priceToCoordinate(zone.low);
        const start = zone.time == null ? 0 : this.chart.timeScale().timeToCoordinate(zone.time);
        if (top == null || bottom == null || start == null) continue;
        const left = Math.max(0, start);
        const height = Math.max(1, bottom - top);
        if (left >= mediaSize.width || top > mediaSize.height || bottom < 0) continue;
        context.fillStyle = zone.color;
        context.fillRect(left, top, mediaSize.width - left, height);
      }
    });
  }
}
