import {decodePngRow} from '../../testing/pixels.js';

/**
 * Screenshots the element and returns the rgb pixels of its middle row.
 *
 * @param {import('@playwright/test').Locator} locator
 */
export async function readRow(locator) {
  const png = await locator.screenshot();
  return locator.page().evaluate(decodePngRow, png.toString('base64'));
}

/**
 * Collects everything that went wrong while loading and running the page: uncaught errors,
 * console errors and requests that did not succeed (including those of workers).
 *
 * @param {import('@playwright/test').Page} page
 */
export function collectProblems(page) {
  /** @type {string[]} */
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.context().on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()}`));
  page.context().on('response', (res) => {
    if (res.status() >= 400) problems.push(`${res.status()}: ${res.url()}`);
  });
  return problems;
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {string[]} the pathnames of all requests made by the page and its workers
 */
export function collectRequests(page) {
  /** @type {string[]} */
  const requests = [];
  page.context().on('request', (req) => requests.push(new URL(req.url()).pathname));
  return requests;
}

/** @param {[number, number, number]} rgb */
export const isRedOrBlueMix = ([r, g, b]) => g < 40 && r + b > 100;
