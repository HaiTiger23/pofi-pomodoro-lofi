const { spawn, spawnSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');
const host = '127.0.0.1';
const port = Number(process.env.POFI_DEV_PORT || 8080);
const url = `http://${host}:${port}`;
let stopping = false;
let electron;
let vue;
function run(file, args, extraEnv = {}, visible = false) {
  const env = { ...process.env, ...extraEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  return spawn(file, args, { stdio: 'inherit', env, windowsHide: !visible });
}
function terminate(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  else child.kill('SIGTERM');
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  terminate(electron);
  terminate(vue);
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
const probe = net.createServer();
probe.once('error', error => {
  console.error(`Cannot start dev server on ${url}: ${error.code}. Set POFI_DEV_PORT to a free port.`);
  stop(1);
});
probe.listen(port, host, () => probe.close(() => {
  vue = run(process.execPath, [require.resolve('@vue/cli-service/bin/vue-cli-service'), 'serve', '--host', host, '--port', String(port)]);
  vue.on('error', error => { console.error(error.message); stop(1); });
  vue.on('exit', code => { if (!stopping) stop(code || 0); });
  wait(Date.now() + 120000);
}));
function wait(deadline) {
  if (stopping) return;
  const retry = () => {
    if (Date.now() >= deadline) { console.error('Vue dev server did not become ready.'); stop(1); }
    else setTimeout(() => wait(deadline), 500);
  };
  const request = http.get(url, response => {
    response.resume();
    if (response.statusCode !== 200) return retry();
    electron = run(require('electron'), [path.resolve(__dirname, '..')], { POFI_DEV_URL: url }, true);
    electron.on('error', error => { console.error(error.message); stop(1); });
    electron.on('exit', code => stop(code || 0));
  });
  request.on('error', retry);
  request.setTimeout(2000, () => request.destroy());
}
