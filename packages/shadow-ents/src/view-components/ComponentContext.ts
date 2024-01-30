import {removeFrom} from '../array-utils.js';
import {ChangeTrailPhase, ComponentChangeType} from '../constants.js';
import {toNamespace} from '../toNamespace.js';
import type {
  IChangeToken,
  IComponentChangeType,
  ICreateEntitiesChange,
  ISetParentChange,
  IUpdateOrderChange,
  NamespaceType,
} from '../types.js';
import {ComponentChanges} from './ComponentChanges.js';
import {ComponentMemory} from './ComponentMemory.js';
import type {ViewComponent} from './ViewComponent.js';

interface ViewInstance {
  component: ViewComponent;
  children: string[]; // we use an Array here and not a Set, because we want to keep the insertion order
  changes: ComponentChanges;
}

declare global {
  // eslint-disable-next-line no-var
  var __shadowEntsContexts: Map<string | symbol, ComponentContext> | undefined;
}

/**
 * The {@link ComponentContext} represents the current real-time state of the _view components_.
 *
 * Changes to the components and their hierarchy are also logged to the {@link ComponentChanges}.
 *
 * Each time a change trail is created (a call to {@link ComponentContext.buildChangeTrails}),
 * the past changes are summarized and returned as the result. This means that the change trail
 * is always the path of changes from the time of the previous change trail (or from the beginning)
 * to the current call to the {@link ComponentContext.buildChangeTrails} method.
 *
 * In addition, there is the {@link ComponentMemory}. The memory represents the component state at
 * the time of the last change trail, as opposed to the {@link ComponentContext}, which represents
 * the current real-time state of the _view components_.
 *
 * A context is always associated with a namespace.
 * If no namespace is specified when creating a {@link ComponentContext}, the global namespace is used.
 * There is only one {@link ComponentContext} (a singleton) for each namespace.
 */
export class ComponentContext {
  static get(namespace?: NamespaceType): ComponentContext {
    if (globalThis.__shadowEntsContexts === undefined) {
      globalThis.__shadowEntsContexts = new Map<NamespaceType, ComponentContext>();
    }
    const ns = toNamespace(namespace);
    if (globalThis.__shadowEntsContexts.has(ns)) {
      return globalThis.__shadowEntsContexts.get(ns)!;
    } else {
      const ctx = new ComponentContext();
      globalThis.__shadowEntsContexts.set(ns, ctx);
      return ctx;
    }
  }

  #components: Map<string, ViewInstance> = new Map();
  #rootComponents: string[] = []; // we use an Array here and not a Set, because we want to keep the insertion order

  #removedComponentsChanges: ComponentChanges[] = [];

  readonly #changeTrailState = new ComponentMemory();
  readonly #componentProperties: Map<string, Map<string, unknown>> = new Map();

  addComponent(component: ViewComponent) {
    if (this.hasComponent(component)) {
      throw new Error(`a view component already exists with the uuid:${component.uuid}`);
    }
    // TODO reuse the component-changes if available
    const changes = new ComponentChanges(component.uuid, component.token, component.order);
    this.#components.set(component.uuid, {
      component: component,
      children: [],
      changes,
    });
    if (component.parent) {
      this.addToChildren(component.parent, component);
      changes.setParent(component.parent.uuid);
    } else {
      this.#appendToOrdered(component, this.#rootComponents);
    }
  }

  hasComponent(component: ViewComponent) {
    return this.#components.has(component.uuid);
  }

  isRootComponent(component: ViewComponent) {
    return this.#rootComponents.includes(component.uuid);
  }

  destroyComponent(component: ViewComponent) {
    if (this.hasComponent(component)) {
      const entry = this.#components.get(component.uuid)!;

      entry.children.slice(0).forEach((childUuid) => this.#components.get(childUuid)?.component.removeFromParent());

      this.#components.delete(component.uuid);
      removeFrom(this.#rootComponents, component.uuid);

      // TODO do not destroy the component-changes - delay this until the next change-trail cycle

      this.#removedComponentsChanges.push(entry.changes);
      entry.changes.destroyEntities();
    }
  }

  removeFromParent(childUuid: string, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      const childEntry = this.#components.get(childUuid)!;
      const entry = this.#components.get(parent.uuid)!;
      const childIdx = entry.children.indexOf(childUuid);
      if (childIdx !== -1) {
        entry.children.splice(childIdx, 1);
        childEntry.changes.setParent(undefined);
      }
      this.#appendToOrdered(childEntry.component, this.#rootComponents);
    }
  }

  isChildOf(child: ViewComponent, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      const entry = this.#components.get(parent.uuid)!;
      return entry.children.includes(child.uuid);
    }
    return false;
  }

  addToChildren(parent: ViewComponent, child: ViewComponent) {
    const entry = this.#components.get(parent.uuid);
    if (entry) {
      this.#appendToOrdered(child, entry.children);
      this.#components.get(child.uuid)?.changes.setParent(parent.uuid);
      removeFrom(this.#rootComponents, child.uuid);
    } else {
      throw new Error(`the view component ${parent.uuid} cannot have a child added to it because the component do not exist!`);
    }
  }

  removeSubTree(uuid: string) {
    const entry = this.#components.get(uuid);
    if (entry) {
      entry.children.slice(0).forEach((childUuid) => this.removeSubTree(childUuid));
      this.destroyComponent(entry.component);
    }
  }

  setProperty<T = unknown>(component: ViewComponent, propKey: string, value: T, isEqual?: (a: T, b: T) => boolean) {
    this.#components.get(component.uuid)?.changes.changeProperty(propKey, value, isEqual);
    this.#getProps(component.uuid).set(propKey, value);
  }

  removeProperty(component: ViewComponent, propKey: string) {
    this.#components.get(component.uuid)?.changes.removeProperty(propKey);
    this.#getProps(component.uuid).delete(propKey);
  }

  #getProps(uuid: string): Map<string, unknown> {
    let props = this.#componentProperties.get(uuid);
    if (props == null) {
      props = new Map();
      this.#componentProperties.set(uuid, props);
    }
    return props;
  }

  changeOrder(component: ViewComponent) {
    if (component.parent) {
      const parentEntry = this.#components.get(component.parent.uuid)!;
      removeFrom(parentEntry.children, component.uuid);
      this.#appendToOrdered(component, parentEntry.children);
    } else {
      removeFrom(this.#rootComponents, component.uuid);
      this.#appendToOrdered(component, this.#rootComponents);
    }
    this.#components.get(component.uuid)?.changes.changeOrder(component.order);
  }

  clear() {
    this.#changeTrailState.clear();
    this.#rootComponents.slice(0).forEach((uuid) => this.removeSubTree(uuid));

    if (this.#rootComponents.length !== 0) {
      throw new Error('component-context panic: #rootComponents is not empty!');
    }

    if (this.#components.size !== 0) {
      throw new Error('component-context panic: #components is not empty!');
    }
  }

  buildChangeTrails() {
    const pathOfChanges = this.#buildPathOfChanges();
    let trail: IComponentChangeType[] = [];

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.StructuralChanges);
    }

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.ContentUpdates);
      changes.clear();
    }

    for (const changes of this.#removedComponentsChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.Removal);
      changes.dispose();
    }

    this.#removedComponentsChanges.length = 0;

    trail = this.#removeCreateDestroyTuples(trail);

    this.#changeTrailState.write(trail);

    this.#componentProperties.clear();

    return trail;
  }

  /**
   * Entities that are both destroyed and re-created within a single change-trail cycle
   * have most likely been reassigned in the DOM. In this case, the create and destroy events
   * are removed from the trail and converted to set-parent, change-token and set-properties events.
   */
  #removeCreateDestroyTuples(trail: IComponentChangeType[]): IComponentChangeType[] {
    const removeCreateUuid = new Set<string>();
    trail = trail.filter((change) => {
      if (change.type === ComponentChangeType.DestroyEntities && this.#components.has(change.uuid)) {
        const create = trail.find((c) => c.type === ComponentChangeType.CreateEntities && c.uuid === change.uuid);
        if (create != null) {
          removeCreateUuid.add(create.uuid);
          return false;
        }
      }
      return true;
    });

    const removedCreateChanges: ICreateEntitiesChange[] = [];
    trail = trail.filter((c) => {
      if (c.type === ComponentChangeType.CreateEntities && removeCreateUuid.has(c.uuid)) {
        removedCreateChanges.push(c);
        return false;
      }
      return true;
    });

    for (const createChange of removedCreateChanges) {
      const vc = this.#components.get(createChange.uuid)?.component;
      if (vc == null) continue;

      const prevState = this.#changeTrailState.getComponentState(createChange.uuid);

      if (prevState == null || prevState.parentUuid !== createChange.parentUuid) {
        const setParentChange: ISetParentChange = {
          type: ComponentChangeType.SetParent,
          uuid: createChange.uuid,
          parentUuid: createChange.parentUuid,
        };

        if (createChange.order !== undefined) {
          setParentChange.order = createChange.order;
        }

        trail.push(setParentChange);
      } else if (prevState != null && createChange.order != null && prevState.order !== createChange.order) {
        const changeToken: IUpdateOrderChange = {
          type: ComponentChangeType.UpdateOrder,
          uuid: createChange.uuid,
          order: createChange.order ?? 0,
        };
        trail.push(changeToken);
      }

      if (prevState == null || prevState.token !== createChange.token) {
        const changeToken: IChangeToken = {
          type: ComponentChangeType.ChangeToken,
          uuid: createChange.uuid,
          token: createChange.token,
        };

        trail.push(changeToken);
      }
    }

    return trail;
  }

  #buildPathOfChanges(): ComponentChanges[] {
    const path: ComponentChanges[] = [];

    const buildPath = (uuid: string) => {
      const component = this.#components.get(uuid);
      if (component) {
        if (component.changes.hasChanges()) {
          path.push(component.changes);
        }
        component.children.forEach((childUuid) => buildPath(childUuid));
      }
    };

    for (const uuid of this.#rootComponents) {
      buildPath(uuid);
    }

    return path;
  }

  #appendToOrdered(component: ViewComponent, childUuids: string[]) {
    if (childUuids.length === 0) {
      childUuids.push(component.uuid);
      return;
    }

    if (childUuids.includes(component.uuid)) {
      return;
    }

    const len = childUuids.length;
    const childComponents = new Array<ViewComponent>(len);

    childComponents[0] = this.#components.get(childUuids[0])!.component;

    if (component.order < childComponents[0].order) {
      childUuids.unshift(component.uuid);
      return;
    }

    if (len === 1) {
      childUuids.push(component.uuid);
      return;
    }

    const lastIdx = len - 1;
    childComponents[lastIdx] = this.#components.get(childUuids[lastIdx])!.component;

    if (component.order >= childComponents[lastIdx].order) {
      childUuids.push(component.uuid);
      return;
    }

    if (len === 2) {
      childUuids.splice(1, 0, component.uuid);
      return;
    }

    for (let i = lastIdx - 1; i >= 1; i--) {
      childComponents[i] = this.#components.get(childUuids[i])!.component;
      if (component.order >= childComponents[i].order) {
        childUuids.splice(i + 1, 0, component.uuid);
        return;
      }
    }
  }
}
