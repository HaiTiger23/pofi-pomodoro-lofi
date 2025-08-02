const { app, BrowserWindow, ipcMain,shell } = require("electron");
const sound = require("sound-play");
const { Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Tạo server Express
const server = express();
let PORT = 8282; // Cổng mặc định, nhưng sẽ tự động tìm cổng trống nếu cổng này đã được sử dụng
let serverRunning = false;
const distPath = path.join(__dirname, 'dist');

// Hàm tìm cổng trống
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const testServer = require('net').createServer();
    testServer.once('error', err => {
      if (err.code === 'EADDRINUSE') {
        // Cổng đã được sử dụng, thử cổng tiếp theo
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    testServer.once('listening', () => {
      // Tìm thấy cổng trống
      const port = testServer.address().port;
      testServer.close(() => {
        resolve(port);
      });
    });
    testServer.listen(startPort);
  });
}

// Phục vụ các file tĩnh từ thư mục dist
async function startServer() {
  if (serverRunning) return true;

  // Kiểm tra xem thư mục dist có tồn tại không
  if (!fs.existsSync(distPath)) {
    console.error('Thư mục dist không tồn tại. Vui lòng chạy lệnh npm run build trước.');
    return false;
  }

  try {
    // Tìm cổng trống
    PORT = await findAvailablePort(PORT);
    console.log(`Tìm thấy cổng trống: ${PORT}`);
  } catch (err) {
    console.error('Không thể tìm cổng trống:', err);
    return false;
  }
  // Cấu hình Express để phục vụ các file tĩnh
  server.use(express.static(distPath));

  // Định tuyến cho các request khác về index.html (cho Vue router)
  // Sử dụng đường dẫn cụ thể thay vì dùng '*' để tránh lỗi path-to-regexp
  server.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Thêm các đường dẫn cụ thể khác nếu cần
  server.get('/index.html', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Khởi động server
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
      serverRunning = true;
      resolve(true);
    }).on('error', (err) => {
      console.error('Lỗi khi khởi động server:', err);
      resolve(false);
    });
  });
}

// Kiểm tra xem thư mục dist có tồn tại không
const checkDistFolder = () => {
  const indexPath = path.join(distPath, 'index.html');

  if (!fs.existsSync(distPath)) {
    console.error('Thư mục dist không tồn tại. Vui lòng chạy lệnh npm run build trước.');
    return false;
  }

  if (!fs.existsSync(indexPath)) {
    console.error('File index.html không tồn tại trong thư mục dist. Vui lòng chạy lệnh npm run build trước.');
    return false;
  }

  return true;
}

const createWindow = async () => {
  // Kiểm tra thư mục dist và khởi động server web
  if (!checkDistFolder()) {
    app.quit();
    return;
  }

  // Khởi động server web
  const serverStarted = await startServer();
  if (!serverStarted) {
    app.quit();
    return;
  }
  const window = new BrowserWindow({
    width: 1000,
    height: 600,
    maximizable: true,
    autoHideMenuBar: true,
    hasShadow: false,
    show: true,
    // Sử dụng file .icns đã được tạo bởi electron-icon-builder
    icon: path.join(__dirname, 'icons/icons/mac/icon.icns'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  window.setMinimumSize(450, 300);
  // Sử dụng server web thay vì file local
  window.loadURL(`http://localhost:${PORT}/`);

  // Ngăn Electron mở link trong app
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); // Mở bằng trình duyệt ngoài
    return { action: 'deny' }; // Không mở trong Electron
  });

  // Chặn click trực tiếp trên link
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Thêm phương thức để bật/tắt chế độ ghim cửa sổ
  ipcMain.handle('toggle-pin-window', (event, shouldPin) => {
    console.log('Toggle pin window:', shouldPin);
    try {
      if (!window.isDestroyed()) {
        window.setAlwaysOnTop(shouldPin, "screen-saver");
      }
      return shouldPin;
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái ghim cửa sổ:', error);
      return false;
    }
  });

  // Thêm phương thức để cập nhật badge trên dock macOS
  ipcMain.handle('update-dock-badge', (event, text, isBreak) => {
    if (process.platform === 'darwin') {
      // Thêm ký tự để phân biệt giữa làm việc và nghỉ ngơi
      if (isBreak) {
        // Thêm biểu tượng cho thời gian nghỉ
        app.dock.setBadge('☕ ' + text); // Biểu tượng tách cà phê
      } else {
        // Thêm biểu tượng cho thời gian làm việc
        app.dock.setBadge('⏱ ' + text); // Biểu tượng đồng hồ
      }
    }
    return true;
  });

  // Thêm phương thức để bắt đầu bộ đếm thời gian trong main process
  ipcMain.handle('start-pomodoro-timer', (event, minutes, seconds, isBreak) => {
    global.pomodoroTimer = {
      minutes: minutes,
      seconds: seconds,
      isBreak: isBreak,
      interval: null,
      isRunning: false
    };

    // Xóa bộ đếm thời gian cũ nếu có
    if (global.pomodoroTimer.interval) {
      clearInterval(global.pomodoroTimer.interval);
    }

    // Cập nhật badge ban đầu
    if (process.platform === 'darwin') {
      const timeText = (global.pomodoroTimer.minutes < 10 ? '0' : '') + global.pomodoroTimer.minutes + 'm';
      if (isBreak) {
        app.dock.setBadge('☕ ' + timeText);
      } else {
        app.dock.setBadge('⏱ ' + timeText);
      }
    }

    // Bắt đầu bộ đếm thời gian
    global.pomodoroTimer.isRunning = true;
    global.pomodoroTimer.interval = setInterval(() => {
      if (global.pomodoroTimer.seconds === 0) {
        if (global.pomodoroTimer.minutes === 0) {
          // Hết thời gian
          clearInterval(global.pomodoroTimer.interval);
          global.pomodoroTimer.isRunning = false;
          if (process.platform === 'darwin') {
            app.dock.setBadge('');
          }
          return;
        }
        global.pomodoroTimer.minutes--;
        global.pomodoroTimer.seconds = 59;
      } else {
        global.pomodoroTimer.seconds--;
      }

      // Cập nhật badge mỗi phút hoặc khi giây = 0
      if (process.platform === 'darwin' && (global.pomodoroTimer.seconds === 0 || global.pomodoroTimer.seconds === 59)) {
        const timeText = (global.pomodoroTimer.minutes < 10 ? '0' : '') + global.pomodoroTimer.minutes + 'm';
        if (global.pomodoroTimer.isBreak) {
          app.dock.setBadge('☕ ' + timeText);
        } else {
          app.dock.setBadge('⏱ ' + timeText);
        }
      }
    }, 1000);

    return true;
  });

  // Thêm phương thức để dừng bộ đếm thời gian
  ipcMain.handle('stop-pomodoro-timer', () => {
    if (global.pomodoroTimer && global.pomodoroTimer.interval) {
      clearInterval(global.pomodoroTimer.interval);
      global.pomodoroTimer.isRunning = false;
      if (process.platform === 'darwin') {
        app.dock.setBadge('');
      }
    }
    return true;
  });

  // Thêm phương thức để tạm dừng bộ đếm thời gian
  ipcMain.handle('pause-pomodoro-timer', () => {
    if (global.pomodoroTimer && global.pomodoroTimer.interval) {
      clearInterval(global.pomodoroTimer.interval);
      global.pomodoroTimer.isRunning = false;
    }
    return true;
  });

  // Thêm phương thức để tiếp tục bộ đếm thời gian
  ipcMain.handle('resume-pomodoro-timer', () => {
    if (global.pomodoroTimer && !global.pomodoroTimer.isRunning) {
      global.pomodoroTimer.isRunning = true;
      global.pomodoroTimer.interval = setInterval(() => {
        if (global.pomodoroTimer.seconds === 0) {
          if (global.pomodoroTimer.minutes === 0) {
            // Hết thời gian
            clearInterval(global.pomodoroTimer.interval);
            global.pomodoroTimer.isRunning = false;
            if (process.platform === 'darwin') {
              app.dock.setBadge('');
            }
            return;
          }
          global.pomodoroTimer.minutes--;
          global.pomodoroTimer.seconds = 59;
        } else {
          global.pomodoroTimer.seconds--;
        }

        // Cập nhật badge mỗi phút hoặc khi giây = 0
        if (process.platform === 'darwin' && (global.pomodoroTimer.seconds === 0 || global.pomodoroTimer.seconds === 59)) {
          const timeText = (global.pomodoroTimer.minutes < 10 ? '0' : '') + global.pomodoroTimer.minutes + 'm';
          if (global.pomodoroTimer.isBreak) {
            app.dock.setBadge('☕ ' + timeText);
          } else {
            app.dock.setBadge('⏱ ' + timeText);
          }
        }
      }, 1000);
    }
    return true;
  });

  // Thêm phương thức để lấy trạng thái hiện tại của bộ đếm thời gian
  ipcMain.handle('get-pomodoro-timer-status', () => {
    if (global.pomodoroTimer) {
      return {
        minutes: global.pomodoroTimer.minutes,
        seconds: global.pomodoroTimer.seconds,
        isBreak: global.pomodoroTimer.isBreak,
        isRunning: global.pomodoroTimer.isRunning
      };
    }
    return null;
  });
  // window.webContents.openDevTools();
  // Lấy vị trí hiện tại
};
app.on("window-all-closed", () => {
  if (process.platform != "darwin") {
    app.quit();
  }
});
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  ipcMain.on('notiFromRender', (event, message) => {
    new Notification({
      title: message.title,
      body: message.body,
      silent: true
    }).show()
    if (message.type == "finish") {
      sound.play(path.join(__dirname, './src/assets/sound/notification/success-fanfare-trumpets-6185.mp3'), 1)
    } else {
      sound.play(path.join(__dirname, './src/assets/sound/notification/simple-notification-152054.mp3'), 1)
    }

  });
});