import { spawn } from 'node:child_process';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../openiddict-server/', import.meta.url));
const build = spawn('dotnet', ['build', '--nologo'], { cwd: directory, stdio: 'inherit' });
build.on('error', error => {
  console.error(error);
  process.exitCode = 1;
});
build.on('exit', code => {
  if (code !== 0) {
    process.exitCode = code ?? 1;
    return;
  }
  const server = spawn('dotnet', ['bin/Debug/net10.0/OpenIddictDemo.dll'], {
    cwd: directory,
    stdio: 'inherit',
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development' },
  });
  server.on('error', error => {
    console.error(error);
    process.exitCode = 1;
  });
  server.on('exit', code => {
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill());
});
