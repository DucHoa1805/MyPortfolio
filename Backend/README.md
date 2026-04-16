# Portfolio Backend (.NET)

Backend nhỏ để nhận form liên hệ và gửi email cho bạn.

## Chạy local

Vào thư mục `Backend` và chạy:

```bash
dotnet restore
dotnet run
```

Mở website tại `http://localhost:5000/` (backend sẽ serve `../index.html` và `../assets/*`).

## Cấu hình SMTP

Sửa `Backend/appsettings.json` mục `Smtp`:

- `Host`: SMTP host (vd: `smtp.gmail.com`)
- `Port`: thường `587`
- `UseStartTls`: `true`
- `Username`: tài khoản SMTP
- `Password`: mật khẩu SMTP (với Gmail thường là **App Password**)
- `FromEmail`: email người gửi
- `ToEmail`: email nhận (inbox của bạn)

## API

- `POST /api/contact`

Body JSON:

```json
{ "name": "...", "email": "...", "message": "..." }
```

