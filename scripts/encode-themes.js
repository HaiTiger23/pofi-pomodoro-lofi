// Format conversion only: preserve artwork size and content, ship smaller WebP files.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await window.loadURL('data:text/html,<title>Theme image encoder</title>');
  for (const theme of ['warm', 'night', 'garden']) {
    const original = fs.readFileSync(path.join(__dirname, '../design/artwork', theme + '.png')).toString('base64');
    const data = await window.webContents.executeJavaScript(`(async () => {
      const blob = await (await fetch('data:image/png;base64,${original}')).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      return [...new Uint8Array(await (await canvas.convertToBlob({type:'image/webp', quality:0.8})).arrayBuffer())];
    })()`);
    const output = path.join(__dirname, '../public/themes', theme + '.webp');
    fs.writeFileSync(output, Buffer.from(data));
    console.log(theme + ': ' + data.length + ' bytes');
  }
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
