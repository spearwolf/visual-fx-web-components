import {readFileSync} from 'node:fs';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import {beforeAll, describe, expect, test} from 'vitest';
import RainbowLine from '../RainbowLine.astro';

const packageDir = new URL('../', import.meta.url);

/** @type {AstroContainer} */
let container;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (props = {}) => container.renderToString(RainbowLine, {props});

const rainbowLineTags = (html) => html.match(/<rainbow-line\b[^>]*>/g) ?? [];

const attributesOf = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));

describe('<RainbowLine>', () => {
  test('renders a single <rainbow-line> with the default attributes', async () => {
    const tags = rainbowLineTags(await render());

    expect(tags).toHaveLength(1);
    expect(attributesOf(tags[0])).toMatchObject({
      'color-slice-width': '10',
      'slice-cycle-time': '7',
      'cycle-direction': 'right',
    });
    expect(attributesOf(tags[0])).not.toHaveProperty('cycle-colors');
    expect(attributesOf(tags[0])).not.toHaveProperty('cycle-colors-repeat');
  });

  test('maps its props to the element attributes', async () => {
    const [tag] = rainbowLineTags(
      await render({
        colorSliceWidth: 0.02,
        sliceCycleTime: 5,
        cycleDirection: 'left',
        cycleColors: '#023 #fa3',
        cycleColorsRepeat: 2,
      }),
    );

    expect(attributesOf(tag)).toMatchObject({
      'color-slice-width': '0.02',
      'slice-cycle-time': '5',
      'cycle-direction': 'left',
      'cycle-colors': '#023 #fa3',
      'cycle-colors-repeat': '2',
    });
  });

  test('joins cycleColors given as an array', async () => {
    const [tag] = rainbowLineTags(await render({cycleColors: ['black', 'white', '#f00']}));

    expect(attributesOf(tag)['cycle-colors']).toBe('black white #f00');
  });

  test('adds a second, blurred line with the same attributes for the shadow', async () => {
    const tags = rainbowLineTags(await render({shadow: true, sliceCycleTime: 3}));

    expect(tags).toHaveLength(2);
    const [line, shadow] = tags.map(attributesOf);
    expect(line.class).toMatch(/\brainbow\b/);
    expect(shadow.class).toMatch(/\brainbow-shadow\b/);
    expect(shadow['slice-cycle-time']).toBe('3');
  });

  test('loads the rainbow-line script from the vendored file below BASE_URL', async () => {
    const html = await render();
    const [, src] = html.match(/<script[^>]*\bsrc="([^"]+)"/) ?? [];

    expect(src).toMatch(/\/js\/rainbow-line-v\d+\.\d+\.\d+\.js$/);

    const vendoredFile = src.split('/').at(-1);
    const vendoredSource = readFileSync(new URL(vendoredFile, packageDir), 'utf8');
    const [, version] = vendoredFile.match(/-v(\d+\.\d+\.\d+)\.js$/);

    // the banner of the vendored build states the same version as its file name
    expect(vendoredSource).toContain(`@version ${version}+`);
    expect(vendoredSource).toContain('customElements.define("rainbow-line"');
  });
});
