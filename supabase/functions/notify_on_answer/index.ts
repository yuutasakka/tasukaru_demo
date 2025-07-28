import { serve } from "std/server";

serve(async (req) => {
  const { record } = await req.json();
  const userEmail = record.email;
  const adminEmail = Deno.env.get("ADMIN_EMAIL") || "noreply@aiconnectx.com";

  // SendGridでメール送信
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    return new Response("SendGrid APIキーが未設定です", { status: 500 });
  }

  // ユーザーへの通知
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: userEmail }], subject: "ご回答ありがとうございます" }],
      from: { email: adminEmail },
      content: [{ type: "text/plain", value: "アンケートへのご回答ありがとうございました！" }],
    }),
  });

  // 管理者への通知
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: adminEmail }], subject: "新しい回答がありました" }],
      from: { email: adminEmail },
      content: [{ type: "text/plain", value: `新しい回答が登録されました。ユーザー: ${userEmail}` }],
    }),
  });

  return new Response("ok");
}); 