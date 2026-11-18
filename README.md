# NestJS Starter API

Dự án backend xây dựng trên nền tảng NestJS, tích hợp xác thực JWT, Prisma ORM (PostgreSQL), Redis cache, Swagger API docs và hỗ trợ đa ngôn ngữ (i18n).

## Yêu cầu hệ thống

Trước khi bắt đầu, đảm bảo hệ thống đã cài đặt:

- Node.js: phiên bản 24+.
- Trình quản lý gói pnpm: phiên bản 12.
- Docker và Docker Compose.

## Hướng dẫn cài đặt

### Bước 1: Cài đặt các gói phụ thuộc

Chạy lệnh sau tại thư mục gốc của dự án:

```bash
pnpm install
```

### Bước 2: Thiết lập biến môi trường

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Kiểm tra và cập nhật các thông số cần thiết trong file `.env` (nếu có thay đổi cấu hình cổng hoặc thông tin bảo mật):

- `PORT`: Cổng chạy ứng dụng (mặc định: `3000`)
- `DATABASE_URL`: Chuỗi kết nối tới cơ sở dữ liệu PostgreSQL
- `REDIS_HOST`, `REDIS_PORT`: Cấu hình kết nối Redis
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: Khóa bí mật cho JWT token

### Bước 3: Khởi động cơ sở dữ liệu và Redis

Khởi chạy container PostgreSQL và Redis ngầm thông qua Docker Compose:

```bash
docker-compose up -d
```

Để dừng các service khi không sử dụng:

```bash
docker-compose down
```

### Bước 4: Khởi tạo và cập nhật cơ sở dữ liệu (Prisma ORM)

Dự án sử dụng Prisma ORM v8. Thực hiện chạy migration để tạo bảng trong cơ sở dữ liệu:

```bash
pnpm db:migrate
```

Nếu có cập nhật mô hình dữ liệu trong `src/prisma/contract.ts`, chạy lệnh sau để sinh lại types và schema contract:

```bash
pnpm db:emit
```

Kiểm tra trạng thái migration:

```bash
pnpm db:status
```

### Bước 5: Khởi chạy ứng dụng

Chạy môi trường phát triển (Development mode kèm auto-reload):

```bash
pnpm start:dev
```

Chạy môi trường sản xuất (Production):

```bash
pnpm build
pnpm start:prod
```

## Kiểm tra ứng dụng

Sau khi khởi chạy thành công:

- API Server: `http://localhost:3000`
- Tài liệu Swagger UI: `http://localhost:3000/api`

## Danh sách lệnh thường dùng

### Khởi chạy

- `pnpm start`: Chạy ứng dụng thông thường
- `pnpm start:dev`: Chạy ứng dụng chế độ dev (watch mode)
- `pnpm start:debug`: Chạy ứng dụng chế độ debug
- `pnpm start:prod`: Chạy ứng dụng đã build trong thư mục `dist`
- `pnpm build`: Biên dịch mã nguồn TypeScript sang JavaScript

### Cơ sở dữ liệu (Prisma)

- `pnpm db:migrate`: Chạy migration vào cơ sở dữ liệu
- `pnpm db:emit`: Cập nhật contract.json và contract.d.ts
- `pnpm db:status`: Xem trạng thái các bản migration
- `pnpm db:init`: Khởi tạo cấu trúc ban đầu cho database

### Kiểm thử (Testing)

- `pnpm test`: Chạy unit tests với Vitest
- `pnpm test:watch`: Chạy unit tests ở chế độ theo dõi file
- `pnpm test:cov`: Đo độ phủ kiểm thử (Coverage)
- `pnpm test:e2e`: Chạy kiểm thử tích hợp đầu cuối (End-to-End)

### Kiểm tra mã nguồn (Lint & Format)

- `pnpm lint`: Quét lỗi mã nguồn bằng Oxlint (type-aware)
- `pnpm format`: Định dạng toàn bộ mã nguồn bằng Prettier

### Đa ngôn ngữ (i18n)

- `pnpm i18n:check`: Kiểm tra tính toàn vẹn của các file dịch i18n
- `pnpm i18n:types`: Sinh TypeScript types cho các chuỗi i18n
