// 認証API エンドポイント
import { SMSAuthService } from '../smsAuth';
import { supabaseAdmin } from '../../lib/supabaseAuth';

export async function POST_sendOTP(request: Request) {
  try {
    const { phoneNumber } = await request.json();
    
    // 入力値検証の強化
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 電話番号フォーマットの厳密な検証
    const phoneRegex = /^(\+81|0)[0-9]{9,10}$/;
    const normalizedPhone = phoneNumber.replace(/[-\s\(\)]/g, '');
    if (!phoneRegex.test(normalizedPhone)) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await SMSAuthService.sendOTP(phoneNumber);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST_verifyOTP(request: Request) {
  try {
    const { phoneNumber, otp } = await request.json();
    
    // 入力値検証の強化
    if (!phoneNumber || !otp || typeof phoneNumber !== 'string' || typeof otp !== 'string') {
      return new Response(JSON.stringify({ error: 'Phone number and OTP are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // OTPフォーマット検証（6桁の数字）
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(otp)) {
      return new Response(JSON.stringify({ error: 'Invalid OTP format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await SMSAuthService.verifyOTP(phoneNumber, otp);
    
    return new Response(JSON.stringify({ success: result.success, error: result.error }), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST_checkAuth(request: Request) {
  try {
    const { phoneNumber } = await request.json();
    
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Supabaseで認証状態をチェック
    const { data, error } = await supabaseAdmin
      .from('sms_verifications')
      .select('is_verified')
      .eq('phone_number', phoneNumber)
      .eq('is_verified', true)
      .single();

    const verified = !error && data?.is_verified === true;
    
    return new Response(JSON.stringify({ verified }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ verified: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}