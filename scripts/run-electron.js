const { spawn } = require('child_process');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const args = process.argv.slice(2);
const hidden = args[0] === '--hidden';
if (hidden) args.shift();
const child = spawn(require('electron'), args, { stdio: 'inherit', windowsHide: hidden, env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
