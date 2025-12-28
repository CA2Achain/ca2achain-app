import { Resend } from 'resend';

let resend: Resend | null = null;

export const initResend = () => {
  if (!process.env.RESEND_API_KEY) {
    console.log('🧪 Resend: No API key provided, using mock email service');
    return null;
  }
  
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend email service initialized');
  }
  return resend;
};

// Mock email sending when no API key
const sendEmail = async (context: string, emailData?: any) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`🧪 Mock Email: ${context}`);
    return { success: true, mock: true };
  }
  
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  
  try {
    const result = await resend.emails.send(emailData);
    if (result.error) {
      throw result.error;
    }
    return { success: true, data: result.data };
  } catch (error) {
    console.error(`Email sending failed for ${context}:`, error);
    return { success: false, error };
  }
};

// =============================================
// BUYER EMAIL TEMPLATES
// =============================================

export const sendBuyerVerificationStarted = async (email: string) => {
  return await sendEmail(`verification started email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Identity Verification Started - CA2AChain',
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Welcome to CA2AChain</h2>
      <p>Your identity verification process has started.</p>
    </div>`
  });
};

export const sendBuyerVerificationComplete = async (email: string) => {
  return await sendEmail(`verification complete email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Identity Verification Complete - CA2AChain', 
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Verification Complete</h2>
      <p>Your identity has been verified successfully.</p>
    </div>`
  });
};

export const sendDataDeletionConfirmation = async (email: string) => {
  return await sendEmail(`data deletion confirmation to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Data Deletion Confirmation - CA2AChain',
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Data Deletion Complete</h2>
      <p>Your personal data has been permanently deleted.</p>
    </div>`
  });
};

// =============================================
// DEALER EMAIL TEMPLATES
// =============================================

export const sendDealerApiKey = async (email: string, companyName: string, apiKey: string) => {
  return await sendEmail(`API key email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Your CA2AChain API Key - Ready to Go!',
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Welcome ${companyName}!</h2>
      <p>Your API key: <code>${apiKey}</code></p>
    </div>`
  });
};

export const sendDealerSubscriptionConfirmed = async (email: string, companyName: string) => {
  return await sendEmail(`subscription confirmation to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Subscription Confirmed - CA2AChain',
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Subscription Active</h2>
      <p>${companyName}, your subscription is now active.</p>
    </div>`
  });
};

export const sendDealerUsageSummary = async (email: string, companyName: string) => {
  return await sendEmail(`usage summary to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Monthly Usage Summary - CA2AChain',
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Usage Summary</h2>
      <p>${companyName}, here's your monthly usage report.</p>
    </div>`
  });
};

// =============================================
// MAGIC LINK AUTH
// =============================================

export const sendMagicLink = async (email: string, magicLink: string) => {
  return await sendEmail(`magic link to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Your CA2AChain Login Link',
    html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2>Login to CA2AChain</h2>
      <p><a href="${magicLink}">Click here to login</a></p>
    </div>`
  });
};