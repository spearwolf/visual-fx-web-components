import {Eventize, Priority} from '@spearwolf/eventize';
import {batch, createSignal, destroySignal, value, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {Kernel} from './Kernel';
import {OnAddChild, OnAddToParent, OnDestroy, OnRemoveChild, OnRemoveFromParent} from './events.js';

/**
 * An uplink has a parent and children, replicating the hierarchy of view components.
 *
 * A signal is created for each view component property.
 *
 * Entities can receive and use the property signals via the uplink.
 */
export class Uplink extends Eventize {
  #kernel: Kernel;
  #uuid: string;

  #signals = new Map<string, [get: SignalReader<any>, set: SignalWriter<any>]>();

  #parentUuid?: string;
  #parent?: Uplink;

  #childrenUuids: Set<string> = new Set();
  #children: Uplink[] = [];

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
      this.#parent = parentUuid ? this.#kernel.getUplink(parentUuid) : undefined;

      if (this.#parent) {
        this.#parent.addChild(this);
      }
    }
  }

  get parent(): Uplink | undefined {
    if (!this.#parent && this.#parentUuid) {
      this.#parent = this.#kernel.getUplink(this.#parentUuid);
    }
    return this.#parent;
  }

  set parent(parent: Uplink | undefined) {
    this.parentUuid = parent?.uuid;
  }

  get hasParent(): boolean {
    return !!this.#parentUuid;
  }

  get children(): readonly Uplink[] {
    return this.#children;
  }

  constructor(kernel: Kernel, uuid: string) {
    super();
    this.#kernel = kernel;
    this.#uuid = uuid;
    this.once(OnDestroy, Priority.Min, this);
  }

  [OnDestroy]() {
    for (const [sig] of this.#signals.values()) {
      destroySignal(sig);
    }
    this.#signals.clear();

    this.off();

    this.#parentUuid = undefined;
    this.#parent = undefined;

    this.#childrenUuids.clear();
    this.#children.length = 0;
  }

  addChild(child: Uplink) {
    if (this.#children.length === 0) {
      this.#childrenUuids.add(child.uuid);
      this.#children.push(child);
      this.emit(OnAddChild, this, child);
      child.emit(OnAddToParent, child, this);
      return;
    }

    if (this.#childrenUuids.has(child.uuid)) {
      throw new Error(`child with uuid: ${child.uuid} already exists! parentUuid: ${this.uuid}`);
    }

    this.#childrenUuids.add(child.uuid);
    this.#children.push(child);

    this.resortChildren();

    this.emit(OnAddChild, this, child);
    child.emit(OnAddToParent, child, this);
  }

  resortChildren() {
    this.#children.sort((a, b) => a.order - b.order);
  }

  removeChild(child: Uplink) {
    if (this.#childrenUuids.has(child.uuid)) {
      this.#childrenUuids.delete(child.uuid);
      this.#children.splice(this.#children.indexOf(child), 1);
      this.emit(OnRemoveChild, this, child);
    }
  }

  removeFromParent() {
    if (this.#parent) {
      const prevParent = this.#parent;
      this.#parent.removeChild(this);
      this.#parent = undefined;
      this.#parentUuid = undefined;
      this.emit(OnRemoveFromParent, this, prevParent);
    }
  }

  getSignal<T = unknown>(key: string): [SignalReader<T>, SignalWriter<T>] {
    if (!this.#signals.has(key)) {
      const signal = createSignal<T>();
      this.#signals.set(key, signal);
      return signal;
    }
    return this.#signals.get(key)!;
  }

  getSignalReader<T = unknown>(key: string): SignalReader<T> {
    return this.getSignal<T>(key)[0];
  }

  getSignalWriter<T = unknown>(key: string): SignalWriter<T> {
    return this.getSignal<T>(key)[1];
  }

  setProperties(properties: [string, unknown][]) {
    batch(() => {
      for (const [key, val] of properties) {
        this.setProperty(key, val);
      }
    });
  }

  setProperty<T = unknown>(key: string, value: T) {
    this.getSignalWriter<T>(key)(value);
  }

  getProperty<T = unknown>(key: string): T {
    return value(this.getSignalReader<T>(key));
  }

  propertyKeys(): string[] {
    return Array.from(this.#signals.keys());
  }

  propertyEntries(): [string, unknown][] {
    return Array.from(this.#signals.entries()).map(([key, [get]]) => [key, value(get)]);
  }
}