import {OffscreenWorkerDisplay} from '@spearwolf/offscreen-display/worker.js';

const display = new OffscreenWorkerDisplay();

let colorSliceWidth = 10;
let sliceCycleTime = 7;
let cycleDirection = -1; // right:-1 or left:1
let cycleColors = undefined;
let cycleColorsRepeat = 1;

let ctx = null;

display.on({
  onCanvas({canvas}, contextAttributes) {
    ctx = canvas.getContext('2d', contextAttributes);
  },

  onFrame({now, canvasWidth: w, canvasHeight: h}) {
    const _colorSliceWidth = colorSliceWidth < 1 ? Math.round(colorSliceWidth * w) : colorSliceWidth;
    let x = 0;
    while (x < w) {
      const xw = x / w;
      if (cycleColors === undefined) {
        const t = ((now % sliceCycleTime) * cycleDirection * 360) / sliceCycleTime;
        ctx.fillStyle = `hsl(${xw * 360 + t}, 100%, 50%)`;
      } else {
        const _cycleColorsRepeat = cycleColorsRepeat < 1 ? w / (cycleColorsRepeat * w) : cycleColorsRepeat;
        const t = ((now % sliceCycleTime) * cycleDirection) / sliceCycleTime;
        let i = ((xw + t) * _cycleColorsRepeat) % 1;
        if (i < 0) i += 1;
        ctx.fillStyle = cycleColors[Math.floor(i * cycleColors.length)];
      }
      ctx.fillRect(x, 0, _colorSliceWidth, h);
      x += _colorSliceWidth;
    }
  },
});

export function parseMessageData(data) {
  display.parseMessageData(data);

  if ('color-slice-width' in data) {
    colorSliceWidth = data['color-slice-width'];
  }
  if ('slice-cycle-time' in data) {
    sliceCycleTime = data['slice-cycle-time'];
  }
  if ('cycle-direction' in data) {
    cycleDirection = data['cycle-direction'];
  }
  if ('cycle-colors' in data) {
    let colors = data['cycle-colors'];
    if (colors === undefined) {
      cycleColors = undefined;
    } else {
      cycleColors = [...colors.toLowerCase().matchAll(/(#[a-f0-9]+|[a-z]+\([^)]+\)|[a-z]+([^(]|$))( |$)+/g)].map((m) =>
        m[0].trim(),
      );
    }
  }
  if ('cycle-colors-repeat' in data) {
    cycleColorsRepeat = data['cycle-colors-repeat'];
  }
}
