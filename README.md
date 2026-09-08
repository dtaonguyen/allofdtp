# DTP Workspace

Landing page nội bộ dẫn đến ba công cụ dược phẩm của DTP:

- Tra cứu dược phẩm: <https://xxct.allofdtp.site>
- Tiêu chuẩn nguyên liệu: <https://tcnl.allofdtp.site>
- Nguồn cung chuẩn & QC: <https://orderhc.allofdtp.site>

Giao diện tối giản với chữ DTP tạo từ các dải sao ở trung tâm và ba liên kết phía dưới. Hạt hội tụ khi vào trang, biến dạng theo con trỏ rồi tự phục hồi. Kéo hoặc dùng phím mũi tên khi focus vào canvas để xoay hình theo chiều sâu. Điều khiển tạm dừng/phát lại vẫn được giữ trong mã để bật lại khi cần, nhưng đang ẩn để giữ bố cục sạch. Chế độ `prefers-reduced-motion` hiển thị hình tĩnh. Renderer nằm trong `components/particle-scene.tsx`; CSS dùng font hệ thống sans-serif, không phụ thuộc tải font ngoài.

## Yêu cầu

- Node.js 22 LTS, phiên bản 22.13 trở lên
- npm

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở địa chỉ được in trong terminal, mặc định là <http://localhost:3000>.

## Kiểm tra và build

```bash
npm run lint
npm run typecheck
npm run build
```

Bản static sau khi build nằm trong `dist/client`. Có thể xem thử bằng:

```bash
npm start
```

## Đưa source lên GitHub

1. Tạo repository mới trên GitHub.
2. Đưa toàn bộ thư mục dự án lên repository, ngoại trừ `node_modules`, `dist`, `.vinext`, `.wrangler` và `.next` (đã được loại trong `.gitignore`).
3. Cấu hình dịch vụ hosting chạy `npm install` rồi `npm run build` và dùng `dist/client` làm thư mục xuất bản.

Tên miền `allofdtp.site`, DNS và SSL chưa được cấu hình trong source này.
