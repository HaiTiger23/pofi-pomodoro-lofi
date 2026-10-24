const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function launch(file, args = []) {
  const calls = [];
  const child = () => ({ exitCode: null, on() {}, kill() {} });
  const request = { on() {}, setTimeout() {} };
  const probe = { once() {}, listen(_port, _host, callback) { callback(); }, close(callback) { callback(); } };
  const modules = {
    child_process: { spawn: (executable, argv, options) => { calls.push({ executable, argv, options }); return child(); }, spawnSync() {} },
    http: { get: (_url, callback) => { callback({ statusCode: 200, resume() {} }); return request; } },
    net: { createServer: () => probe },
    path,
    electron: 'electron.exe'
  };
  const requireModule = name => modules[name];
  requireModule.resolve = () => 'vue-cli-service.js';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts', file), 'utf8'), {
    require: requireModule, __dirname: path.join(__dirname, '../scripts'), console,
    process: { execPath: 'node.exe', platform: 'win32', env: { ELECTRON_RUN_AS_NODE: '1' }, argv: ['node', file, ...args], on() {}, exit() {} },
    setTimeout() {}
  });
  return calls;
}
test('normal app launcher does not hide the Electron GUI', () => {
  const [call] = launch('run-electron.js', ['.']);
  assert.equal(call.options.windowsHide, false);
  assert.equal(call.options.env.ELECTRON_RUN_AS_NODE, undefined);
  assert.deepEqual([...call.argv], ['.']);
});
test('only explicit background launch hides the Electron process', () => {
  const [call] = launch('run-electron.js', ['--hidden', 'tests/smoke.electron.js']);
  assert.equal(call.options.windowsHide, true);
  assert.deepEqual([...call.argv], ['tests/smoke.electron.js']);
});
test('dev launches a visible app after the hidden Vue helper is ready', () => {
  const calls = launch('dev.js');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].executable, 'node.exe');
  assert.equal(calls[0].options.windowsHide, true);
  assert.equal(calls[1].executable, 'electron.exe');
  assert.equal(calls[1].options.windowsHide, false);
  assert.equal(calls[1].options.env.POFI_DEV_URL, 'http://127.0.0.1:8080');
});
