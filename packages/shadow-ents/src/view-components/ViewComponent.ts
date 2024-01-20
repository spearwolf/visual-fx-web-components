import {generateUUID} from '../generateUUID.js';
import {ComponentContext} from './ComponentContext.js';

class ViewComponentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViewComponentError';
  }
}

export class ViewComponent {
  readonly #uuid: string;
  readonly #token: string;

  #context?: ComponentContext;

  #parent?: ViewComponent;
  #order = 0;

  get uuid() {
    return this.#uuid;
  }

  get token() {
    return this.#token;
  }

  get parent(): ViewComponent | undefined {
    return this.#parent;
  }

  set parent(parent: ViewComponent | null | undefined) {
    if (parent) {
      if (parent.#context !== this.#context) {
        throw new ViewComponentError('cannot set parent from different context');
      }
      parent.addChild(this);
    } else {
      this.removeFromParent();
    }
  }

  get context(): ComponentContext | undefined {
    return this.#context;
  }

  set context(context: ComponentContext | null | undefined) {
    if (this.#context != context) {
      if (this.#context) {
        this.disconnectFromContext();
      }
      this.#context = context;
      if (context) {
        context.addComponent(this);
      }
    }
  }

  /**
   * The order property sets the order to lay out a component in a children array of the parent component.
   *
   * Items in a children array are sorted by ascending order value and then by their insertion order.
   */
  get order(): number {
    return this.#order;
  }

  set order(order: number | null | undefined) {
    const prevOrder = this.#order;
    this.#order = order ?? 0;
    if (prevOrder !== this.#order) {
      this.#context.changeOrder(this);
    }
  }

  constructor(token: string, options?: {parent?: ViewComponent; order?: number; context?: ComponentContext; uuid?: string}) {
    if (options instanceof ViewComponent) {
      options = {parent: options};
    }

    this.#uuid = options?.uuid ?? generateUUID();

    this.#token = token;
    this.#order = options?.order ?? 0;
    this.#parent = options?.parent;

    const ctx = options?.context ?? ComponentContext.get();

    if (this.#parent && this.#parent.#context !== ctx) {
      throw new ViewComponentError('cannot set parent from different context');
    }

    this.context = ctx;
  }

  isChildOf(entity: ViewComponent) {
    return this.#parent === entity;
  }

  removeFromParent() {
    if (this.#parent) {
      this.#context?.removeFromParent(this.uuid, this.#parent);
      this.#parent = undefined;
    }
  }

  addChild(child: ViewComponent) {
    if (child.#context !== this.#context) {
      throw new ViewComponentError('cannot add a child from another context');
    }
    if (!child.isChildOf(this)) {
      child.removeFromParent();
      child.#parent = this;
      this.#context.addToChildren(this, child);
    }
  }

  setProperty<T = unknown>(name: string, value: T, isEqual?: (a: T, b: T) => boolean) {
    this.#context.setProperty(this, name, value, isEqual);
  }

  removeProperty(name: string) {
    this.#context.removeProperty(this, name);
  }

  disconnectFromContext() {
    this.removeFromParent();
    if (this.#context != null) {
      this.#context.removeComponent(this);
      this.#context = undefined;
    }
  }
}
