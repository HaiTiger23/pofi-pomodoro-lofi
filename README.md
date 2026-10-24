# Pofi v1.3.0 — Góc tập trung lofi

<img src="./public/pofi-logo.png" alt="Pofi — logo lofi" width="96" height="96" />

Pofi là ứng dụng Pomodoro kết hợp với nhạc nền từ YouTube, giúp bạn tập trung làm việc hiệu quả. Ứng dụng được phát triển bằng Electron và Vue.js, hỗ trợ cả Windows và macOS.

## Tính năng chính

### 🕒 Pomodoro Timer
- Thiết lập thời gian làm việc và nghỉ ngơi
- Thông báo khi kết thúc phiên làm việc/nghỉ ngơi
- Tự động chuyển đổi giữa các phiên

### 🎵 Nhạc nền
- Phát nhạc từ YouTube
- Tìm kiếm bài hát yêu thích
- Điều chỉnh âm lượng
- Nhiều âm thanh môi trường (mưa, sông suối, thành phố, tiếng ồn trắng, lửa, sóng biển)

### ❤️ Danh sách yêu thích
- Lưu các bài hát yêu thích
- Phát lại nhanh chóng
- Quản lý danh sách dễ dàng

### 📜 Lịch sử phát
- Lưu 50 bài hát gần nhất
- Không lưu trùng lặp
- Phát lại nhanh chóng

### ✅ Quản lý công việc
- Thêm, xóa, đánh dấu hoàn thành công việc
- Thiết lập mức độ ưu tiên (thấp, trung bình, cao)
- Lọc theo trạng thái (tất cả, đang làm, hoàn thành)
- Lưu trữ dữ liệu cục bộ

## Giao diện lofi

Nút chọn giao diện ở thanh trên cùng có ba theme: **Góc ấm**, **Đêm mơ** và **Vườn sớm**. Lựa chọn được lưu tự động, áp dụng cho toàn bộ giao diện và vẫn giữ nguyên sau khi mở lại ứng dụng. Dùng phím mũi tên, Home hoặc End để chuyển lựa chọn khi đang chọn theme.

**Liquid Glass** là công tắc riêng ở đầu bảng Giao diện & nền, áp dụng hiệu ứng kính trong, viền phản sáng và nút bo tròn cho mọi theme. Bật/tắt hiệu ứng không đổi nền hay bảng màu; trạng thái được lưu tự động. Theme Liquid Glass cũ tự chuyển thành nền Đêm mơ cùng hiệu ứng kính bật.

Nguồn nền có thể chọn riêng: **Ảnh lofi** tĩnh, **YouTube mờ** từ ảnh bài nhạc đang phát hoặc **Video** YouTube. Có thể chuyển nhanh bằng nút đổi nền ở thanh nhạc.

Ứng dụng mở trong cửa sổ 460×620, thu nhỏ được đến 320×340 và có nút ghim luôn ở trên. Bố cục tự co theo cả chiều rộng và chiều cao; toàn app không cuộn dọc hoặc ngang. Chỉ nội dung trong bảng và danh sách dài được cuộn.

Thanh tiêu đề hệ thống được thay bằng điều khiển ngay trong app: thu nhỏ, phóng to/khôi phục và đóng. Kéo vùng trống ở thanh trên cùng để di chuyển cửa sổ. Khi cửa sổ hẹp hơn 520px, nhóm tiện ích thu vào nút menu ở bên phải, bấm để trượt ngang ra/vào. Chọn một mục, bấm ra ngoài hoặc nhấn Escape sẽ thu menu; các nút cửa sổ luôn hiện.

Logo lofi mới dùng hình cốc cà phê và tai nghe, đồng bộ trong app, favicon và bộ icon Windows/macOS. Ảnh gốc và prompt được lưu trong [tài liệu logo](design/logo-prompt.md).

Nút **Thu gọn thành dock** ở cạnh các nút cửa sổ chuyển app thành thanh ngang 320×72, chỉ hiện đồng hồ Pomodoro, play/pause nhạc và nút mở rộng. Dock tự ghim lên trên và kéo được bằng vùng trống. Timer và player giữ nguyên, nhạc không bị tải lại khi đổi chế độ. Mở rộng khôi phục kích thước, trạng thái phóng to và trạng thái ghim trước đó; nếu kéo dock sang vị trí khác thì app mở rộng tại vị trí mới, trong vùng màn hình đang dùng.

Quy chuẩn màu sắc, component và prompt tạo ảnh được ghi trong [bộ giao diện](docs/design-system.md).

## Cài đặt

### Yêu cầu hệ thống
- Windows 10/11 hoặc macOS 10.13+
- 4GB RAM trở lên
- Khoảng 270MB sau khi cài đặt, chưa tính file bộ cài

### Link tải ứng dụng

- Bộ cài Windows x64 v1.3.0 sau khi build: `dist_electron/Pofi Setup 1.3.0.exe`. Mở file này để cài đặt; không cần Node.js.
- Bản chạy trực tiếp để kiểm tra: `dist_electron/win-unpacked/Pofi.exe`; giữ nguyên toàn bộ thư mục đi kèm.
- [Bản Windows cũ v1.2.1](https://drive.google.com/file/d/1OGaqyZdTP6PjFSijZmEHJU88mUyyNU3a/view?usp=sharing).

## Hướng dẫn sử dụng

### Pomodoro Timer
1. Thiết lập thời gian làm việc và nghỉ ngơi
2. Nhấn nút "Bắt đầu" để khởi động timer
3. Làm việc cho đến khi hết thời gian
4. Nghỉ ngơi khi timer chuyển sang chế độ nghỉ

### Nhạc nền
1. Mở nút tìm nhạc ở thanh phát, nhập từ khóa hoặc dán link YouTube
2. Nhấp vào bài hát để phát
3. Điều chỉnh âm lượng bằng thanh trượt
4. Thêm vào danh sách yêu thích bằng nút trái tim

Bảng tìm nhạc có nền rõ để dễ đọc cả khi bật hiệu ứng kính. Ô tìm kiếm giữ cố định; danh sách kết quả cuộn riêng và có nút **Tải thêm kết quả** ở cuối. App tải đầy đủ kết quả của từng trang YouTube, loại bài trùng giữa các trang và giữ các bài đã tải khi thử lại sau lỗi mạng.

Tìm kiếm cần kết nối Internet và đọc kết quả công khai từ YouTube qua tiến trình Electron (hoặc endpoint cục bộ khi chạy trình duyệt). Nếu YouTube chặn truy cập hay thay đổi định dạng kết quả, app hiển thị lỗi; bạn vẫn có thể dán link video để phát.

### Quản lý công việc
1. Nhấp vào biểu tượng danh sách công việc ở góc trên bên phải
2. Nhập tên công việc và chọn mức độ ưu tiên
3. Nhấn Enter hoặc nút "+" để thêm công việc
4. Đánh dấu hoàn thành bằng cách nhấp vào ô checkbox
5. Lọc công việc bằng các nút "Tất cả", "Đang làm", "Hoàn thành"
6. Xóa công việc đã hoàn thành bằng nút "Xóa đã hoàn thành"

## Lịch sử phiên bản

### v1.3.0 — 24/10/2026

- Bộ giao diện lofi gồm Góc ấm, Đêm mơ, Vườn sớm; công tắc Liquid Glass độc lập với nền.
- Logo cốc cà phê và tai nghe mới cho giao diện, favicon và icon ứng dụng.
- Cửa sổ không viền, điều khiển cửa sổ trong app và menu trượt ngang thu gọn khi cửa sổ nhỏ.
- Dock 320×72 tự ghim, giữ timer và nhạc đang phát; mở rộng khôi phục kích thước và trạng thái ghim cũ.
- Nền ảnh tĩnh, ảnh YouTube mờ hoặc video; bố cục responsive không cuộn toàn app.
- Bảng tìm nhạc riêng dễ đọc, tải thêm kết quả theo trang, bỏ trùng và cho thử lại khi lỗi mạng.
- Sửa timer khi chạy nền/ngủ máy, lưu trữ desktop, vòng đời player và lỗi cửa sổ dev không hiển thị.

### v1.2.2
- Ẩn devtool
### v1.2.1
- Cải thiện giao diện người dùng
- Cho phép người dùng xóa lịch sử bài hát 
- Thêm chức năng xem video 
- Random bài hát mới sau khi hết bài

### v1.1.0
- ✨ Thêm tính năng Quản lý công việc
- 🔊 Bổ sung thêm nhiều âm thanh môi trường
- 🌙 Cải thiện giao diện người dùng
- 🐛 Sửa các lỗi nhỏ và cải thiện hiệu suất

## Phát triển

Dùng Node.js 24 và npm. `package-lock.json` là lockfile dùng trong CI. Lockfile Yarn cũ được giữ nguyên trong `yarn.lock.legacy` để tránh Vue CLI yêu cầu cài thêm Yarn.

```sh
npm ci
npm run dev
```

`dev` khởi động Vue tại http://127.0.0.1:8080, chờ giao diện sẵn sàng rồi mở Electron với hot reload. Đóng Electron hoặc nhấn Ctrl+C sẽ dừng các tiến trình của phiên dev. Nếu cổng bận, đặt biến `POFI_DEV_PORT` sang cổng khác.

Các lệnh khác:

| Lệnh | Công dụng |
|---|---|
| `npm start` | Build giao diện rồi chạy ứng dụng desktop |
| `npm run serve` | Chạy giao diện trong trình duyệt |
| `npm run electron:dev` | Kết nối Electron vào Vue dev server đang chạy |
| `npm run build` | Build giao diện vào `dist/` |
| `npm run lint` | Kiểm tra mã nguồn, không tự sửa file |
| `npm test` | Kiểm thử timer, lưu trữ, launcher, tìm kiếm và vòng đời player |
| `npm run test:electron` | Kiểm tra preload, IPC, ba theme, công tắc kính, timer và bố cục trên Electron thật; dùng `dist/` có sẵn hoặc đặt `POFI_DEV_URL` tới dev server |
| `npm run build:electron` | Build và tạo bộ cài cho hệ điều hành hiện tại |
| `npm run build:win` | Build bộ cài Windows NSIS x64, không tự phát hành |
| `npm run package-win` | Tạo thư mục ứng dụng Windows bằng Electron Packager |
| `npm run package` | Tạo thư mục ứng dụng macOS x64 bằng Electron Packager |

Bản cài Windows nằm trong `dist_electron/`; bản Packager nằm trong `package/`. Icon đã có sẵn trong repository; dùng `npm run generate-icons` khi thay logo. CI kiểm tra lint/test rồi đóng gói Windows và macOS, chỉ tạo GitHub Release khi đẩy tag `v*`. Các bản build chưa cấu hình chứng chỉ ký mã.

### Kiến trúc

- `electron/timer.js`: một bộ đếm dựa trên mốc kết thúc; Electron tự chuyển phiên và gửi thông báo dù renderer chạy nền. Sau phiên nghỉ ứng dụng trở về trạng thái chờ.
- `electron/storage.js`: lưu file JSON bằng cách ghi file tạm rồi thay thế; giữ bản sao khi file JSON hỏng.
- `shared/validation.js`: kiểm tra thời lượng và chuẩn hóa dữ liệu được dùng chung ở main process và giao diện.
- `src/services/youtube-player.js`: quản lý một player, một vòng cập nhật tiến độ; loại bỏ callback từ bài cũ.
- `src/components/MusicPlayer.vue`, `MusicSearch.vue`: phát nhạc và tìm kiếm.
- `src/App.vue`: quản lý các bảng chức năng qua props/emits.
- Âm thanh môi trường chỉ khởi tạo player khi tăng âm lượng; tắt tiếng sẽ tạm dừng player.

### Dữ liệu và giới hạn

Desktop lưu cài đặt, công việc, lịch sử và yêu thích trong `settings.json` thuộc thư mục `app.getPath('userData')`, độc lập với cổng HTTP. Ứng dụng nhập dữ liệu từ localStorage của origin đang mở cho các mục chưa được nhập hoặc chỉnh sửa trên desktop. Mặc định được tạo khi chạy ở cổng mới không chặn việc nhập dữ liệu cũ sau này; các mục đã chỉnh sửa trên desktop được ưu tiên. Nếu trước đây từng chạy trên cổng khác, cần mở lại origin cũ để lấy dữ liệu trước khi di chuyển thủ công.

Trình duyệt dùng localStorage theo origin. Timer trình duyệt cũng dùng mốc kết thúc nhưng thông báo phụ thuộc vào quyền đã cấp và việc trang còn mở. Desktop vẫn giữ timer khi reload giao diện; đóng hoàn toàn ứng dụng sẽ dừng phiên hiện tại.

Thời lượng làm việc/nghỉ phải là số nguyên từ 1 đến 1440 phút. Nhạc và tìm kiếm cần kết nối YouTube. Bản này đọc kết quả tìm kiếm công khai; nếu YouTube giới hạn truy cập, bạn có thể thử lại hoặc dán URL/video ID để phát. Âm báo desktop nằm ngoài ASAR trong `resources/sounds/`.

## Giấy phép

Phát triển bởi Hải Dev - © 2025
