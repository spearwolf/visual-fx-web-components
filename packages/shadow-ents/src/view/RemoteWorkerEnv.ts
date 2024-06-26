import {eventize, type EventizeApi} from '@spearwolf/eventize';
import {
  AppliedChangeTrail,
  ChangeTrail,
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  Loaded,
  MessageToView,
  WorkerChangeTrailTimeout,
  WorkerConfigureTimeout,
  WorkerDestroyTimeout,
  WorkerLoadTimeout,
} from '../constants.js';
import createWorker from '../create-worker.js';
import {waitForMessageOfType} from '../elements/waitForMessageOfType.js';
import {toUrlString} from '../toUrlString.js';
import type {AppliedChangeTrailEvent, ChangeTrailType, ImportedModuleEvent, TransferablesType} from '../types.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

const removeTransferables = (changeTrail: ChangeTrailType): TransferablesType | undefined => {
  let transferables: TransferablesType | undefined;

  if (changeTrail != null && Array.isArray(changeTrail)) {
    for (const changeItem of changeTrail) {
      if (changeItem.transferables) {
        if (!transferables) {
          transferables = changeItem.transferables;
        } else {
          transferables = [...transferables, ...changeItem.transferables];
        }
        delete changeItem.transferables;
      }
    }
  }

  return transferables;
};

export interface RemoteWorkerEnv extends EventizeApi {}

export class RemoteWorkerEnv implements IShadowObjectEnvProxy {
  static WorkerLoaded = 'workerLoaded';

  #worker?: Worker;
  #isDestroyed = false;
  #changeTrailSerial = 0;

  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  get workerLoaded(): Promise<RemoteWorkerEnv> {
    return this.onceAsync<RemoteWorkerEnv>(RemoteWorkerEnv.WorkerLoaded);
  }

  constructor() {
    eventize(this);
    this.retain(RemoteWorkerEnv.WorkerLoaded);
  }

  async start(): Promise<void> {
    if (this.#worker) {
      console.warn('RemoteWorkerEnv: already started');

      return this.workerLoaded.then(() => {
        if (this.isDestroyed) {
          throw 'RemoteWorkerEnv: worker was destroyed';
        }
        return undefined;
      });
    }

    const worker = (this.#worker = createWorker());

    try {
      await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout);

      if (this.isDestroyed) {
        throw 'RemoteWorkerEnv: worker was destroyed';
      }

      worker.addEventListener('message', this.onMessageFromWorker.bind(this));

      queueMicrotask(() => {
        this.emit(RemoteWorkerEnv.WorkerLoaded, this);
      });
    } catch (error) {
      console.error('RemoteWorkerEnv: failed to start', error);
      this.#worker = undefined;
      throw error;
    }
  }

  onMessageFromWorker(event: MessageEvent) {
    if (event.data?.type === MessageToView) {
      (this as IShadowObjectEnvProxy).onMessageToView?.(event.data.data);
    } else {
      console.debug('RemoteWorkerEnv: message from worker', event);
    }
  }

  applyChangeTrail(changeTrail: ChangeTrailType): Promise<void> {
    const transferables = removeTransferables(changeTrail);
    const serial = ++this.#changeTrailSerial;
    const message = {type: ChangeTrail, changeTrail, serial};
    this.#worker.postMessage(message, transferables);
    return waitForMessageOfType(this.#worker, AppliedChangeTrail, WorkerChangeTrailTimeout, (data: AppliedChangeTrailEvent) => {
      if (data.error) throw data.error;
      return data.serial === serial;
    });
  }

  importScript(url: URL | string): Promise<void> {
    url = toUrlString(url);
    this.#worker.postMessage({type: Configure, importModule: url});
    return waitForMessageOfType(this.#worker, ImportedModule, WorkerConfigureTimeout, (data: ImportedModuleEvent) => {
      if (data.error) throw data.error;
      return data.url === url;
    });
  }

  destroy(): void {
    if (!this.#worker) return;

    const worker = this.#worker;
    this.#worker = undefined;

    this.#isDestroyed = true;

    worker.postMessage({type: Destroy});

    waitForMessageOfType(worker, Destroyed, WorkerDestroyTimeout).finally(() => {
      worker.terminate();
    });
  }
}
