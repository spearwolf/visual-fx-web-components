// A typescript consumer of the published packages: npm-packages.spec.js type-checks this file with `strict`
// settings against the .npm-pkg directories. It is never executed.

import 'rainbow-line';

import {type EventListenerMethods, on} from '@spearwolf/eventize';
import {OffscreenDisplay} from '@spearwolf/offscreen-display';
import {OffscreenWorkerDisplay, type OffscreenWorkerDisplayEvents} from '@spearwolf/offscreen-display/worker.js';
import {RainbowLineElement} from 'rainbow-line/RainbowLineElement.js';
import {parseMessageData} from 'rainbow-line/RainbowLineWorkerDisplay.js';

export class MyDisplay extends OffscreenDisplay {
  override createWorker(): Worker {
    return new Worker(new URL('./my-display.worker.js', import.meta.url), {type: 'module'});
  }

  override getInitialWorkerAttributes() {
    return {speed: this.asNumberValue('speed', 1)};
  }
}

export const element = new MyDisplay();
export const worker: Worker | undefined = element.worker;

export const display = new OffscreenWorkerDisplay();

export let frameTime: number = 0;
export let frameWidth: number = 0;
export let frameHeight: number = 0;
export let framePixelRatio: number = 1;

export const listeners: EventListenerMethods<OffscreenWorkerDisplayEvents> = {
  onCanvas({canvas}) {
    canvas?.getContext('2d');
  },
  onFrame({now, canvasWidth, canvasHeight, pixelRatio}) {
    frameTime = now;
    frameWidth = canvasWidth;
    frameHeight = canvasHeight;
    framePixelRatio = pixelRatio;
  },
};

on(display, listeners);

display.parseMessageData({resize: {width: 640, height: 480, pixelRatio: 2}});

export const frameEvent: 'onFrame' = OffscreenWorkerDisplay.Frame;
export const ready: boolean = display.ready;

// @ts-expect-error canvasWidth is a number
export const notAString: string = display.canvasWidth;

export class MyRainbowLine extends RainbowLineElement {
  override getContextAttributes() {
    return {alpha: true};
  }
}

parseMessageData({'cycle-colors': 'red blue'});
