import type { OidcClient } from '@axa-fr/oidc-client';

import {
  type ApiResult,
  describeDemoError,
  runResourceActionAsync,
} from '../../shared/resourcePlayground';

/** Renders the native resource API playground without displaying bearer credentials. */
export function displayResources(client: OidcClient): void {
  const container = document.getElementById('resources');
  if (!container) throw new Error('The resource playground container is missing.');
  const section = document.createElement('section');
  const title = document.createElement('h1');
  title.textContent = 'RFC 8707 resource playground';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.dataset.testid = 'resource-status';
  status.textContent = 'Ready to acquire separate API tokens.';
  const resultElements = {
    orders: document.createElement('pre'),
    inventory: document.createElement('pre'),
  };
  const results: { orders?: ApiResult; inventory?: ApiResult } = {};
  const buttons: HTMLButtonElement[] = [];
  section.append(title);
  for (const [action, label] of [
    ['call', 'Call both APIs'],
    ['renew', 'Renew Orders'],
    ['clear', 'Clear Orders'],
    ['wrong-target', 'Test wrong destination'],
    ['provider-error', 'Test provider error'],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = label;
    buttons.push(button);
    button.addEventListener('click', async (): Promise<void> => {
      buttons.forEach(button => {
        button.disabled = true;
      });
      try {
        const result = await runResourceActionAsync(client, action);
        results.orders = action === 'clear' ? undefined : (result.orders ?? results.orders);
        results.inventory = result.inventory ?? results.inventory;
        status.textContent = result.message;
        for (const api of ['orders', 'inventory'] as const) {
          resultElements[api].textContent = results[api]
            ? JSON.stringify(results[api], null, 2)
            : 'No acquired resource token.';
        }
      } catch (error) {
        console.error('Resource demo failed:', describeDemoError(error));
        status.textContent = describeDemoError(error);
      } finally {
        buttons.forEach(button => {
          button.disabled = false;
        });
      }
    });
    section.append(button);
  }
  section.append(status);
  for (const api of ['orders', 'inventory'] as const) {
    const heading = document.createElement('h2');
    heading.textContent = api === 'orders' ? 'Orders API' : 'Inventory API';
    resultElements[api].dataset.testid = `${api}-result`;
    resultElements[api].textContent = 'No acquired resource token.';
    section.append(heading, resultElements[api]);
  }
  container.replaceChildren(section);
}
