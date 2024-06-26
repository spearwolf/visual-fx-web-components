import type {ShadowEntityElement} from './ShadowEntityElement.js';
import type {RequestContextEventName, ShadowElementType} from './constants.js';

export interface RequestContextEvent extends CustomEvent {
  detail: {
    requester: ShadowEntityElement;
    types: ShadowElementType[];
  };
}

export interface ShadowEntsEventMap {
  [RequestContextEventName]: RequestContextEvent;
}

declare global {
  interface HTMLElementEventMap extends ShadowEntsEventMap {
    addEventListener<K extends keyof ShadowEntsEventMap>(
      type: K,
      listener: (this: Document, ev: ShadowEntsEventMap[K]) => void,
    ): void;
    dispatchEvent<K extends keyof ShadowEntsEventMap>(ev: ShadowEntsEventMap[K]): void;
  }
}
