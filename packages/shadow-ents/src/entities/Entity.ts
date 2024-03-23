import {Eventize, Priority} from '@spearwolf/eventize';
import {
  batch,
  createSignal,
  destroySignals,
  value,
  type SignalFuncs,
  type SignalReader,
  type SignalWriter,
} from '@spearwolf/signalize';
import type {IComponentEvent} from '../types.js';
import {Kernel} from './Kernel.js';
import {SignalsMap} from './SignalsMap.js';
import {SignalsPath} from './SignalsPath.js';
import {onDestroy, onViewEvent} from './events.js';

type ContextNameType = string | symbol;

interface IContext {
  name: ContextNameType;
  inherited$$: SignalFuncs<unknown>;
  provide$$: SignalFuncs<unknown>;
  context$$: SignalFuncs<unknown>;
  ctxPath: SignalsPath;
  unsubscribeFromPath: () => void;
  unsubscribeFromParent?: () => void;
}

/**
 * An entity has a parent and children, replicating the hierarchy of view-components.
 *
 * A signal is created for each view-component property.
 *
 * Shadow-objects can use the signal properties via the entity.
 */
export class Entity extends Eventize {
  #kernel: Kernel;
  #uuid: string;

  #props = new SignalsMap();
  #context: Map<ContextNameType, IContext> = new Map();

  #parentUuid?: string;
  #parent?: Entity;

  #childrenUuids: Set<string> = new Set();
  #children: Entity[] = [];

  #order = 0;

  get kernel(): Kernel {
    return this.#kernel;
  }

  get uuid(): string {
    return this.#uuid;
  }

  get order(): number {
    return this.#order;
  }

  set order(value: number) {
    if (this.#order !== value) {
      this.#order = value;
      if (this.#parentUuid) {
        this.parent!.resortChildren();
      }
    }
  }

  get parentUuid(): string | undefined {
    return this.#parentUuid || undefined;
  }

  set parentUuid(parentUuid: string | undefined) {
    if (this.#parentUuid !== parentUuid) {
      this.removeFromParent();

      this.#parentUuid = parentUuid || undefined;
      this.#parent = parentUuid ? this.#kernel.getEntity(parentUuid) : undefined;

      if (this.#parent) {
        this.#parent.addChild(this);
      }
    }
  }

  get parent(): Entity | undefined {
    if (!this.#parent && this.#parentUuid) {
      this.#parent = this.#kernel.getEntity(this.#parentUuid);
    }
    return this.#parent;
  }

  set parent(parent: Entity | undefined) {
    this.parentUuid = parent?.uuid;
  }

  get hasParent(): boolean {
    return !!this.#parentUuid;
  }

  get children(): readonly Entity[] {
    return this.#children;
  }

  constructor(kernel: Kernel, uuid: string) {
    super();
    this.#kernel = kernel;
    this.#uuid = uuid;
    this.once(onDestroy, Priority.Min, this);
  }

  traverse(callback: (entity: Entity) => void) {
    callback(this);
    for (const child of this.#children) {
      child.traverse(callback);
    }
  }

  onDestroy() {
    this.#props.clear();
    this.off();

    for (const ctx of this.#context.values()) {
      ctx.unsubscribeFromPath();
      ctx.unsubscribeFromParent?.();
      ctx.ctxPath.dispose();
      destroySignals(ctx.inherited$$, ctx.provide$$, ctx.context$$);
    }

    this.#parentUuid = undefined;
    this.#parent = undefined;

    this.#childrenUuids.clear();
    this.#children.length = 0;
  }

  addChild(child: Entity) {
    if (this.#children.length === 0) {
      this.#childrenUuids.add(child.uuid);
      this.#children.push(child);
      // this.emit(onAddChild, this, child);
      // child.emit(onAddToParent, child, this);
      return;
    }

    if (this.#childrenUuids.has(child.uuid)) {
      throw new Error(`child with uuid: ${child.uuid} already exists! parentUuid: ${this.uuid}`);
    }

    this.#childrenUuids.add(child.uuid);
    this.#children.push(child);

    this.resortChildren();

    for (const [, ctx] of child.#context) {
      child.#subscribeToParentContext(ctx);
    }

    // this.emit(onAddChild, this, child);
    // child.emit(onAddToParent, child, this);
  }

  resortChildren() {
    this.#children.sort((a, b) => a.order - b.order);
  }

  removeChild(child: Entity) {
    if (this.#childrenUuids.has(child.uuid)) {
      this.#childrenUuids.delete(child.uuid);
      this.#children.splice(this.#children.indexOf(child), 1);
      // this.emit(onRemoveChild, this, child);
    }
  }

  removeFromParent() {
    if (this.#parent) {
      // const prevParent = this.#parent;

      this.#parent.removeChild(this);

      this.#parent = undefined;
      this.#parentUuid = undefined;

      for (const [, ctx] of this.#context) {
        if (ctx.unsubscribeFromParent) {
          ctx.unsubscribeFromParent();
          ctx.unsubscribeFromParent = undefined;
        }
      }

      // this.emit(onRemoveFromParent, this, prevParent);
    }
  }

  emitViewEvents(events: IComponentEvent[]) {
    for (const {type, data} of events) {
      this.emit(onViewEvent, type, data);
    }
  }

  #getPropSignal<T = unknown>(key: string): SignalFuncs<T> {
    return this.#props.getSignal<T>(key);
  }

  getPropertyReader<T = unknown>(key: string): SignalReader<T> {
    return this.#getPropSignal<T>(key)[0];
  }

  getPropertyWriter<T = unknown>(key: string): SignalWriter<T> {
    return this.#getPropSignal<T>(key)[1];
  }

  setProperties(properties: [string, unknown][]) {
    batch(() => {
      for (const [key, val] of properties) {
        this.setProperty(key, val);
      }
    });
  }

  setProperty(key: string, value: unknown) {
    this.getPropertyWriter(key)(value);
  }

  getProperty<T = unknown>(key: string): T {
    return value(this.getPropertyReader<T>(key));
  }

  propKeys(): string[] {
    return Array.from(this.#props.keys());
  }

  propEntries(): [string, unknown][] {
    return Array.from(this.#props.entries()).map(([key, [get]]) => [key, value(get)]);
  }

  hasContext(name: ContextNameType): boolean {
    return this.#context.has(name);
  }

  // TODO(test) write tests for useContext()

  useContext<T = unknown>(name: ContextNameType): SignalReader<T> {
    return this.#getContext(name).context$$[0] as SignalReader<T>;
  }

  // TODO(test) write tests for provideContext()

  provideContext<T = unknown>(name: ContextNameType): SignalFuncs<T> {
    return this.#getContext(name).provide$$.slice(0) as SignalFuncs<T>;
  }

  #getContext(name: ContextNameType): IContext {
    let ctx = this.#context.get(name);
    if (ctx == null) {
      const inherited$$ = createSignal();
      const provide$$ = createSignal();
      const context$$ = createSignal();

      const ctxPath = new SignalsPath();
      ctxPath.add(provide$$[0], inherited$$[0]);

      const unsubscribeFromPath = ctxPath.on(SignalsPath.Value, (val) => {
        queueMicrotask(() => {
          context$$[1](val);
        });
      });

      ctx = {name, inherited$$, provide$$, context$$, ctxPath, unsubscribeFromPath};
      this.#context.set(name, ctx);

      this.#subscribeToParentContext(ctx);
    }
    return ctx;
  }

  #subscribeToParentContext(ctx: IContext) {
    if (this.parent) {
      ctx.unsubscribeFromParent?.();
      ctx.unsubscribeFromParent = this.parent.#getContext(ctx.name).ctxPath.on(SignalsPath.Value, (val) => {
        ctx.inherited$$[1](val);
      });
    }
  }
}
