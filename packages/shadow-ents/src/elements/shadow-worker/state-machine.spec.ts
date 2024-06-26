/* eslint-env mocha */

import sinon from 'sinon';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createActor} from 'xstate';

import {machine} from './state-machine.js';

const getState = (actor: any) => actor.getSnapshot().value;
const getContext = (actor: any) => actor.getSnapshot().context;

describe('shadow-worker/state-machine', () => {
  it('createActor', () => {
    const actor = createActor(machine);

    expect(actor).to.be.ok;
    expect(actor.start).to.be.a('function');

    expect(getContext(actor).src).to.equal('');
    expect(getContext(actor).connected).to.be.false;
  });

  it('updateConnectedState', () => {
    const actor = createActor(machine);
    actor.start();

    expect(getContext(actor).connected).to.be.false;

    actor.send({type: 'updateConnectedState', connected: true} as any);

    expect(getContext(actor).connected).to.be.true;
  });

  it('start', () => {
    const actor = createActor(machine);
    actor.start();

    expect(getState(actor)).to.equal('new');
  });

  describe('new', () => {
    let actor: any;
    let loadWorker: any;

    beforeEach(() => {
      actor = createActor(machine);
      loadWorker = sinon.spy();

      actor.on('loadWorker', loadWorker);
      actor.start();
    });

    afterEach(() => {
      actor.stop();
      sinon.restore();
    });

    it('initialized :src -> loading', () => {
      actor.send({type: 'initialized', src: 'foo.js'});

      expect(getState(actor)).to.equal('loading');
      expect(getContext(actor).src).to.equal('foo.js');

      expect(loadWorker.calledOnce).to.be.true;
      expect(loadWorker.lastCall.args).to.deep.equal([{type: 'loadWorker', src: 'foo.js'}]);
    });

    it('initialized -> constructed', () => {
      actor.send({type: 'initialized'});

      expect(getState(actor)).to.equal('constructed');
      expect(loadWorker.notCalled).to.be.true;
    });
  });
});
