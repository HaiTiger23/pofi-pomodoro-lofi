const { spawn } = require('child_process');
const env = { ...process.env, POFI_DEV_URL: process.env.POFI_DEV_URL || 'http://127.0.0.1:8080' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.'], { stdio: 'inherit', windowsHide: false, env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
