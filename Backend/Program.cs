using System.Net.Mail;
using System.Text;
using System.Threading.RateLimiting;
using MailKitSmtpClient = MailKit.Net.Smtp.SmtpClient;
using MailKit.Security;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using MimeKit;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRateLimiter(options =>
{
  options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
  options.AddPolicy("contact", httpContext =>
  {
    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
    {
      PermitLimit = 3,
      Window = TimeSpan.FromMinutes(1),
      QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
      QueueLimit = 0
    });
  });
});

builder.Services.AddCors(options =>
{
  options.AddPolicy("site", policy =>
  {
    var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    policy
      .WithOrigins(origins)
      .AllowAnyHeader()
      .AllowAnyMethod();
  });
});

var app = builder.Build();

app.UseRateLimiter();
app.UseCors("site");

// Serve existing static site from repo root (../index.html, ../assets/*)
var siteRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, ".."));
var siteProvider = new PhysicalFileProvider(siteRoot);
app.UseFileServer(new FileServerOptions
{
  FileProvider = siteProvider,
  EnableDefaultFiles = true
});

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.MapPost("/api/contact", async (ContactRequest req, IConfiguration config, CancellationToken ct) =>
{
  var err = Validate(req);
  if (err is not null) return Results.BadRequest(new { error = err });

  var smtp = config.GetSection("Smtp").Get<SmtpOptions>() ?? new SmtpOptions();
  var smtpErr = ValidateSmtp(smtp);
  if (smtpErr is not null) return Results.Problem(smtpErr, statusCode: 500);

  var msg = BuildMessage(req, smtp);
  await SendAsync(msg, smtp, ct);

  return Results.Ok(new { ok = true });
})
.RequireRateLimiting("contact");

app.Run();

static string? Validate(ContactRequest r)
{
  if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Trim().Length < 2) return "Vui lòng nhập họ tên (tối thiểu 2 ký tự).";
  if (string.IsNullOrWhiteSpace(r.Email)) return "Vui lòng nhập email.";
  if (!MailAddress.TryCreate(r.Email.Trim(), out _)) return "Email không hợp lệ.";
  if (string.IsNullOrWhiteSpace(r.Message) || r.Message.Trim().Length < 10) return "Nội dung quá ngắn (tối thiểu 10 ký tự).";
  if (r.Message.Length > 4000) return "Nội dung quá dài.";
  return null;
}

static string? ValidateSmtp(SmtpOptions s)
{
  if (string.IsNullOrWhiteSpace(s.Host)) return "SMTP Host chưa được cấu hình (Smtp:Host).";
  if (s.Port <= 0) return "SMTP Port chưa hợp lệ (Smtp:Port).";
  if (string.IsNullOrWhiteSpace(s.Username)) return "SMTP Username chưa được cấu hình (Smtp:Username).";
  if (string.IsNullOrWhiteSpace(s.Password)) return "SMTP Password chưa được cấu hình (Smtp:Password).";
  if (string.IsNullOrWhiteSpace(s.FromEmail)) return "FromEmail chưa được cấu hình (Smtp:FromEmail).";
  if (string.IsNullOrWhiteSpace(s.ToEmail)) return "ToEmail chưa được cấu hình (Smtp:ToEmail).";
  return null;
}

static MimeMessage BuildMessage(ContactRequest r, SmtpOptions s)
{
  var subject = $"[Portfolio] {r.Name} - {r.Email}";
  var sb = new StringBuilder();
  sb.AppendLine("Bạn có tin nhắn liên hệ mới từ portfolio:");
  sb.AppendLine();
  sb.AppendLine($"Tên: {r.Name}");
  sb.AppendLine($"Email: {r.Email}");
  sb.AppendLine();
  sb.AppendLine("Nội dung:");
  sb.AppendLine(r.Message);

  var msg = new MimeMessage();
  msg.From.Add(new MailboxAddress(s.FromName ?? "Portfolio Contact", s.FromEmail));
  msg.To.Add(new MailboxAddress(s.ToName ?? "Owner", s.ToEmail));
  msg.ReplyTo.Add(new MailboxAddress(r.Name, r.Email.Trim()));
  msg.Subject = subject;
  msg.Body = new TextPart("plain") { Text = sb.ToString() };
  return msg;
}

static async Task SendAsync(MimeMessage message, SmtpOptions s, CancellationToken ct)
{
  using var client = new MailKitSmtpClient();
  client.Timeout = 15_000;

  var secure = s.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
  await client.ConnectAsync(s.Host, s.Port, secure, ct);
  await client.AuthenticateAsync(s.Username, s.Password, ct);
  await client.SendAsync(message, ct);
  await client.DisconnectAsync(true, ct);
}

record ContactRequest(string Name, string Email, string Message);

sealed class SmtpOptions
{
  public string Host { get; set; } = "";
  public int Port { get; set; } = 587;
  public bool UseStartTls { get; set; } = true;
  public string Username { get; set; } = "";
  public string Password { get; set; } = "";
  public string FromEmail { get; set; } = "";
  public string? FromName { get; set; }
  public string ToEmail { get; set; } = "";
  public string? ToName { get; set; }
}

