import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS設定 - 本番ドメインのみ許可
const allowedOrigins = [
  'https://moneyticket.vercel.app',
  'https://moneyticket-git-main-sakkayuta.vercel.app',
  'https://moneyticket01-10gswrw2q-seai0520s-projects.vercel.app',
  'https://moneyticket01-rogabfsul-seai0520s-projects.vercel.app',
  'https://moneyticket01-18dyp3oo0-seai0520s-projects.vercel.app',
];

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// リクエストボディの型定義
interface ApprovalRequest {
  requestId: string;
  action: 'approve' | 'reject';
  adminNotes?: string;
  reviewedBy?: string;
}

// レスポンスの型定義
interface ApprovalResponse {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
}

// パスワード生成関数
function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // 各文字種から最低1文字ずつ含める
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 残りの文字をランダムに生成
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // パスワードをシャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// メール送信関数
async function sendNotificationEmail(
  email: string,
  fullName: string,
  action: 'approve' | 'reject',
  password?: string,
  adminNotes?: string
): Promise<void> {
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  
  if (!sendgridApiKey) {
    return;
  }

  const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@aiconectx.co.jp";
  
  let subject: string;
  let content: string;
  
  if (action === 'approve') {
    subject = "AI ConnectX - アカウント承認のお知らせ";
    content = `
${fullName} 様

この度は、AI ConnectXへのユーザー登録申請をいただき、ありがとうございます。

申請内容を確認させていただき、アカウントの承認が完了いたしました。
以下の認証情報でログインしてください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ログイン情報】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

メールアドレス: ${email}
初回パスワード: ${password}

※ セキュリティのため、初回ログイン後にパスワードの変更をお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ログインURL: ${Deno.env.get("SITE_URL") || "https://aiconectx.co.jp"}/login

${adminNotes ? `
【管理者からのメッセージ】
${adminNotes}
` : ''}

今後ともAI ConnectXをよろしくお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI ConnectX サポートチーム
Email: support@aiconectx.co.jp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  } else {
    subject = "AI ConnectX - 申請結果のお知らせ";
    content = `
${fullName} 様

この度は、AI ConnectXへのユーザー登録申請をいただき、ありがとうございます。

申請内容を慎重に検討させていただきましたが、現在のところ承認を見送らせていただくこととなりました。

${adminNotes ? `
【理由】
${adminNotes}
` : ''}

ご不明な点やご質問がございましたら、下記までお気軽にお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI ConnectX サポートチーム
Email: support@aiconectx.co.jp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ 
          to: [{ email: email }], 
          subject: subject 
        }],
        from: { email: fromEmail },
        content: [{ 
          type: "text/plain", 
          value: content 
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
    }
  } catch (error) {
  }
}

// ログ記録関数
function logInfo(message: string, data?: any) {
}

function logError(message: string, error?: any) {
}

function logWarn(message: string, data?: any) {
}

serve(async (req) => {
  // 動的CORS設定
  const origin = req.headers.get('origin');
  const dynamicCorsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': (origin && allowedOrigins.includes(origin)) ? origin : 'null'
  };

  // CORS プリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: dynamicCorsHeaders });
  }

  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: '認証が必要です' }),
        { 
          status: 401, 
          headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // リクエストボディの解析
    const requestBody: ApprovalRequest = await req.json();
    const { requestId, action, adminNotes, reviewedBy } = requestBody;

    // バリデーション
    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'requestIdとactionは必須です' }),
        { 
          status: 400, 
          headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'actionはapproveまたはrejectである必要があります' }),
        { 
          status: 400, 
          headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 申請データを取得
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ success: false, error: '申請が見つからないか、既に処理済みです' }),
        { 
          status: 404, 
          headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let userId: string | undefined;
    let generatedPassword: string | undefined;

    // 承認処理
    if (action === 'approve') {
      // 一意なパスワードを生成
      generatedPassword = generateSecurePassword(12);

      // Supabase Authでユーザーを作成
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: request.email,
        password: generatedPassword,
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          full_name: request.full_name,
          phone_number: request.phone_number,
          organization: request.organization
        }
      });

      if (authError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `ユーザーアカウントの作成に失敗しました: ${authError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      userId = authUser.user?.id;

      // プロファイルテーブルを更新（トリガーで自動作成されるが、追加情報を設定）
      if (userId) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            full_name: request.full_name,
            phone_number: request.phone_number,
            organization: request.organization,
            role: 'user',
            status: 'active',
            requires_password_change: true
          })
          .eq('id', userId);

        if (profileError) {
        }

        // ユーザーロールを追加
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role_name: 'user',
            granted_by: null, // システムによる自動付与
            is_active: true
          });

        if (roleError) {
        }
      }
    }

    // 申請ステータスを更新
    const { error: updateError } = await supabaseAdmin
      .from('registration_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: adminNotes || '',
        reviewed_by: reviewedBy || 'system',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '申請ステータスの更新に失敗しました' 
        }),
        { 
          status: 500, 
          headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // アクティビティログを記録
    const { error: logError } = await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId || null,
        action: `registration_${action}`,
        details: {
          request_id: requestId,
          email: request.email,
          full_name: request.full_name,
          admin_notes: adminNotes,
          reviewed_by: reviewedBy
        }
      });

    if (logError) {
    }

    // メール通知を送信
    try {
      await sendNotificationEmail(
        request.email,
        request.full_name,
        action,
        generatedPassword,
        adminNotes
      );
    } catch (emailError) {
      // メール送信エラーは処理を停止させない
    }

    // レスポンス
    const response: ApprovalResponse = {
      success: true,
      message: action === 'approve' 
        ? 'ユーザーアカウントが作成され、メール通知が送信されました' 
        : '申請が却下され、メール通知が送信されました',
      userId: userId
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'サーバー内部エラーが発生しました' 
      }),
      { 
        status: 500, 
        headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 