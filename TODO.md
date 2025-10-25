# Đồng bộ màu header và sidebar cho các trang thongbao_sv, lichhoc_sv, lichsu_sv, caidat_sv với trang login

## Các bước thực hiện:
1. Cập nhật biến CSS trong `frontend/src/app/thongbao_sv/global.css`:
   - Thay đổi `--nav-start` và `--nav-end` trong `:root` và `@media (prefers-color-scheme: dark)` thành `#38BDF8` và `#3B82F6`.

2. Cập nhật biến CSS trong `frontend/src/app/lichhoc_sv/global.css`:
   - Thay đổi `--nav-start` và `--nav-end` trong `:root` và `@media (prefers-color-scheme: dark)` thành `#38BDF8` và `#3B82F6`.

3. Cập nhật biến CSS trong `frontend/src/app/lichsu_sv/global.css`:
   - Thay đổi `--nav-start` và `--nav-end` trong `:root` và `@media (prefers-color-scheme: dark)` thành `#38BDF8` và `#3B82F6`.

4. Cập nhật biến CSS trong `frontend/src/app/caidat_sv/global.css`:
   - Thay đổi `--nav-start` và `--nav-end` trong `:root` thành `#38BDF8` và `#3B82F6`.

## Kiểm tra sau khi hoàn thành:
- Kiểm tra giao diện của các trang để đảm bảo màu sắc header và sidebar khớp với trang login.

## Trạng thái hoàn thành:
- [x] Cập nhật `frontend/src/app/thongbao_sv/global.css`
- [x] Cập nhật `frontend/src/app/lichhoc_sv/global.css`
- [x] Cập nhật `frontend/src/app/lichsu_sv/global.css`
- [x] Cập nhật `frontend/src/app/caidat_sv/global.css`
