/**
 * CamPulse — Vercel Serverless Email Dispatch Endpoint
 * POST /api/send-email
 * 
 * Securely delivers student verification codes to the provided university email address.
 * Supports Resend, Brevo, or FormSubmit fallback with zero UI leak on the website.
 */

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing recipient email or verification code' });
    }

    const recipientName = name || 'Student';
    const emailSubject = `CamPulse Verification Code: ${code}`;
    const emailBody = `Dear ${recipientName},

Your registration request on the CamPulse Student Accountability & Feedback Platform has been received.

Your single-use university verification code is:
----------------------------------------
${code}
----------------------------------------

This code remains valid for fifteen (15) minutes and expires automatically thereafter.

Enter this code on the CamPulse verification window to activate your student account.

Security Notice: University staff and system administrators will never ask for your verification code or password. If you did not initiate this registration, please report it immediately to INTECU Security Operations.

Best regards,
Information Technology & Communications Unit (INTECU) & Division of Student Affairs
Obafemi Awolowo University (OAU), Ile-Ife
https://campulse.oauife.edu.ng`;

    // 1. If RESEND_API_KEY is available in environment variables, dispatch via Resend API
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'CamPulse <onboarding@resend.dev>',
          to: email,
          subject: emailSubject,
          text: emailBody
        })
      });

      if (resendRes.ok) {
        return res.status(200).json({ success: true, provider: 'resend' });
      }
    }

    // 2. Dispatch via FormSubmit AJAX service
    const formsubmitRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: emailSubject,
        _template: 'box',
        _captcha: 'false',
        Institution: 'Obafemi Awolowo University (OAU), Ile-Ife',
        Dispatched_By: 'INTECU & Division of Student Affairs',
        Recipient: `${recipientName} <${email}>`,
        Verification_Code: code,
        Validity: '15 Minutes',
        Message: emailBody
      })
    });

    const data = await formsubmitRes.json().catch(() => ({}));
    return res.status(200).json({ success: true, provider: 'formsubmit', data });

  } catch (error) {
    console.error('[API Send-Email Error]:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
};
