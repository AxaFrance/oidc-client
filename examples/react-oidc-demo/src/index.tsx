import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { prepareDemoWorkerAsync } from '../../shared/provider';
import App from './App';
import { demoEnvironment } from './configurations';

async function startDemoAsync(): Promise<void> {
  if (!(await prepareDemoWorkerAsync(demoEnvironment))) return;
  const container = document.getElementById('root');
  if (!container) throw new Error('The React demo root element is missing.');
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

startDemoAsync().catch((error: unknown): void => {
  console.error('React demo startup failed:', error);
  const container = document.getElementById('root');
  if (container)
    container.textContent = error instanceof Error ? error.message : 'React demo startup failed.';
});
