import {Eventize, Priority} from '@spearwolf/eventize';
import {
  batch,
  createSignal,
  destroySignal,
  value,
  type SignalFuncs,
  type SignalReader,
  type SignalWriter,
} from '@spearwolf/signalize';
import {Kernel} from './Kernel.js';
import {onAddChild, onAddToParent, onDestroy, onEntityCreate, onRemoveChild, onRemoveFromParent} from './events.js';

// TODO add token to Entity ?

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

  #signals = new Map<string, SignalFuncs<any>>();

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
    this.retain(onEntityCreate);
  }

  onDestroy() {
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

  addChild(child: Entity) {
    if (this.#children.length === 0) {
      this.#childrenUuids.add(child.uuid);
      this.#children.push(child);
      this.emit(onAddChild, this, child);
      child.emit(onAddToParent, child, this);
      return;
    }

    if (this.#childrenUuids.has(child.uuid)) {
      throw new Error(`child with uuid: ${child.uuid} already exists! parentUuid: ${this.uuid}`);
    }

    this.#childrenUuids.add(child.uuid);
    this.#children.push(child);

    this.resortChildren();

    this.emit(onAddChild, this, child);
    child.emit(onAddToParent, child, this);
  }

  resortChildren() {
    this.#children.sort((a, b) => a.order - b.order);
  }

  removeChild(child: Entity) {
    if (this.#childrenUuids.has(child.uuid)) {
      this.#childrenUuids.delete(child.uuid);
      this.#children.splice(this.#children.indexOf(child), 1);
      this.emit(onRemoveChild, this, child);
    }
  }

  removeFromParent() {
    if (this.#parent) {
      const prevParent = this.#parent;
      this.#parent.removeChild(this);
      this.#parent = undefined;
      this.#parentUuid = undefined;
      this.emit(onRemoveFromParent, this, prevParent);
    }
  }

  getSignal<T = unknown>(key: string): SignalFuncs<T> {
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
