import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, VoidToken} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {findElementsById} from '../src/findElementsById.js';
import {nextChangeTrail} from '../src/nextSyncEvent.js';
import {render} from '../src/render.js';

describe('change props', () => {
  beforeEach(async () => {
    render(`
      <shadow-local-env id="localEnv">
        <shadow-entity id="a" token="a"></shadow-entity>
        <shadow-entity id="b"></shadow-entity>
      </shadow-local-env>`);

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('works as expected', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', 666);
    b.viewComponent.setProperty('xyz', [1, 2, 3]);

    let changeTrail = await nextChangeTrail(localEnv.getShadowEnv());

    // console.log('changeTrail:before', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail:before').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
        properties: [
          ['foo', 'bar'],
          ['plah', 666],
        ],
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: VoidToken,
        properties: [['xyz', [1, 2, 3]]],
      },
    ]);

    // ---

    a.viewComponent.setProperty('plah', 999);
    a.viewComponent.setProperty('null', null);
    b.viewComponent.removeProperty('xyz');
    b.viewComponent.removeProperty('gibsnich');

    changeTrail = await nextChangeTrail(localEnv.getShadowEnv());

    // console.log('changeTrail:after', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail:after').to.deep.equal([
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [
          ['plah', 999],
          ['null', null],
        ],
      },
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: b.uuid,
        properties: [['xyz', undefined]],
      },
    ]);

    // ---

    a.viewComponent.setProperty('phoenix', 23);
    b.append(a);
    a.viewComponent.setProperty('neu', 'new');
    a.viewComponent.removeProperty('null');

    changeTrail = await nextChangeTrail(localEnv.getShadowEnv());

    // console.log('changeTrail:after:2', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail:after:2').to.deep.equal([
      {
        type: ComponentChangeType.SetParent,
        uuid: a.uuid,
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [
          ['phoenix', 23],
          ['neu', 'new'],
          ['null', undefined],
        ],
      },
    ]);
  });
});
