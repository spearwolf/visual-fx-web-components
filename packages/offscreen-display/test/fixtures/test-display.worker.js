import {on} from '@spearwolf/eventize';
import {getSignalsCount} from '@spearwolf/signalize';
import {OffscreenWorkerDisplay} from '../../dist/offscreen-display-worker.js';

// reports every event of the display back to the main thread and fills the canvas on each frame,
// so the test can observe the worker side from the outside

const display = new OffscreenWorkerDisplay();

let ctx;
let fillStyle = '#ff0000';
let frames = 0;
let throwInNextFrame = false;

on(display, {
  onCanvas({canvas}, contextAttributes) {
    ctx = canvas.getContext('2d', contextAttributes);
    self.postMessage({event: 'canvas', contextAttributes});
  },

  onInit() {
    self.postMessage({event: 'init'});
  },

  onResize({canvasWidth, canvasHeight, pixelRatio}) {
    self.postMessage({event: 'resize', width: canvasWidth, height: canvasHeight, pixelRatio});
  },

  onFrame({now, canvasWidth, canvasHeight, pixelRatio}) {
    if (throwInNextFrame) {
      throwInNextFrame = false;
      throw new Error('boom from onFrame');
    }
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    self.postMessage({event: 'frame', frame: ++frames, now, width: canvasWidth, height: canvasHeight, pixelRatio});
  },
});

self.addEventListener('message', ({data}) => {
  if (data.fillStyle) {
    fillStyle = data.fillStyle;
    return;
  }
  if (data.throwInNextFrame) {
    throwInNextFrame = true;
    return;
  }
  if (data.destroy) {
    const signalsBefore = getSignalsCount();
    display.destroy();
    self.postMessage({event: 'destroyed', signalsBefore, signalsAfter: getSignalsCount()});
    return;
  }
  if (data.canvas) {
    const {canvas: _canvas, contextAttributes: _contextAttributes, ...initialAttributes} = data;
    self.postMessage({event: 'initialAttributes', initialAttributes});
  }
  display.parseMessageData(data);

  // answers after the display has handled the message, so every frame rendered before it arrives ahead of this answer
  if ('isConnected' in data) {
    self.postMessage({event: 'isConnected', isConnected: data.isConnected});
  }
});
