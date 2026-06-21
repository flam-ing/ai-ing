export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const { contact, content } = body;

    if (!contact || !content) {
      return new Response(JSON.stringify({ error: '연락처/이메일 정보와 문의 내용을 입력해 주세요.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = env.RESEND_API_KEY || 're_74hdmhBF_DCDT7FYiNfHFWkibrzonQz3e';
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: '서버 설정 오류: RESEND_API_KEY 환경변수가 설정되지 않았습니다. Cloudflare Pages 대시보드에서 RESEND_API_KEY를 등록해 주세요.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI-ing Contact <onboarding@resend.dev>',
        to: 'rlaalsdn4564@gmail.com',
        subject: `[에이아잉 문의] 새로운 문의가 접수되었습니다.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e3e5ea; border-radius: 8px;">
            <h2 style="color: #3b33a5; margin-bottom: 20px; border-bottom: 2px solid #3b33a5; padding-bottom: 10px;">에이아잉 새로운 문의 접수</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #5c6573; width: 120px;">연락처 / 이메일</td>
                <td style="padding: 8px 0; color: #0c0e14; font-size: 15px;">${contact}</td>
              </tr>
            </table>
            <div style="background: #f4f5f7; padding: 15px; border-radius: 4px; border: 1px solid #e3e5ea; margin-top: 10px;">
              <h4 style="margin-top: 0; color: #0c0e14;">문의 내용</h4>
              <p style="white-space: pre-wrap; line-height: 1.6; color: #333; margin-bottom: 0;">${content}</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return new Response(JSON.stringify({ error: `이메일 발송 API 오류: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `서버 오류: ${err.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
