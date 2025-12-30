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
    console.log('📧 Email data:', { to: emailData?.to, subject: emailData?.subject });
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
// AUTHENTICATION EMAILS (MAGIC LINK)
// =============================================

export const sendMagicLink = async (email: string, magicLink: string, accountType?: 'buyer' | 'dealer') => {
  const context = accountType ? `${accountType} magic link` : 'magic link';
  const title = accountType === 'dealer' ? 'Dealer Portal Login' : 'Login to CA2AChain';
  
  return await sendEmail(`${context} to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: `${title} - CA2AChain`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>${title}</h2>
        <p>Click the link below to securely login to your account:</p>
        <p style="margin: 20px 0;">
          <a href="${magicLink}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Login to CA2AChain
          </a>
        </p>
        <p><small>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</small></p>
      </div>
    `
  });
};

// =============================================
// BUYER WORKFLOW EMAILS
// =============================================

export const sendBuyerWelcome = async (email: string, firstName?: string) => {
  const greeting = firstName ? `Hi ${firstName}` : 'Welcome';
  
  return await sendEmail(`buyer welcome email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Welcome to CA2AChain - Next Steps',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>${greeting}!</h2>
        <p>Thank you for creating your CA2AChain account.</p>
        <p>Next steps:</p>
        <ol>
          <li>Complete your one-time payment ($39)</li>
          <li>Provide identity verification via Persona</li>
          <li>Your account will be ready for age/address verification</li>
        </ol>
        <p>Questions? Reply to this email and we'll help!</p>
      </div>
    `
  });
};

export const sendBuyerVerificationComplete = async (email: string, firstName?: string) => {
  const greeting = firstName ? `Hi ${firstName}` : 'Hello';
  
  return await sendEmail(`verification complete email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Identity Verification Complete - CA2AChain', 
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>${greeting}!</h2>
        <p>🎉 Your identity verification is now complete!</p>
        <p>Your account is ready to verify your age and address with participating dealers.</p>
        <p>All verification requests are processed securely using zero-knowledge proofs to protect your privacy.</p>
      </div>
    `
  });
};

export const sendBuyerDataDeletionConfirmation = async (email: string) => {
  return await sendEmail(`CCPA data deletion confirmation to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Data Deletion Complete - CA2AChain',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>Data Deletion Complete</h2>
        <p>Per your request, your personal data has been permanently deleted from our systems.</p>
        <p>This includes:</p>
        <ul>
          <li>Personal identification information</li>
          <li>Encrypted driver's license data</li>
          <li>Account details</li>
        </ul>
        <p><small>Compliance events and payment records have been anonymized but preserved for business and legal requirements.</small></p>
      </div>
    `
  });
};

// =============================================
// DEALER WORKFLOW EMAILS
// =============================================

export const sendDealerWelcome = async (email: string, companyName: string, subscriptionTier: number) => {
  const tierNames = { 1: 'Starter', 2: 'Business', 3: 'Enterprise' };
  const tierName = tierNames[subscriptionTier as keyof typeof tierNames] || 'Starter';
  
  return await sendEmail(`dealer welcome email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Welcome to CA2AChain Dealer Portal',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome ${companyName}!</h2>
        <p>Your ${tierName} account has been created successfully.</p>
        <p>Your API key will be provided separately for security purposes.</p>
        <p>With your account, you can:</p>
        <ul>
          <li>Verify customer age and address</li>
          <li>Comply with AB 1263 regulations</li>
          <li>Access secure blockchain-verified records</li>
        </ul>
        <p>Questions? Our team is here to help!</p>
      </div>
    `
  });
};

export const sendDealerApiKey = async (email: string, companyName: string, apiKey: string) => {
  return await sendEmail(`API key email to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: '🔑 Your CA2AChain API Key - Keep Secure!',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>API Key for ${companyName}</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <code style="font-size: 14px; word-break: break-all;">${apiKey}</code>
        </div>
        <p><strong>Important:</strong></p>
        <ul>
          <li>Store this key securely - we cannot recover it</li>
          <li>Use it in your API requests for authentication</li>
          <li>Contact us immediately if compromised</li>
        </ul>
        <p>Ready to start verifying customers!</p>
      </div>
    `
  });
};

export const sendDealerCreditLowWarning = async (email: string, companyName: string, creditsRemaining: number) => {
  return await sendEmail(`credit warning to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: '⚠️ Low Credit Balance - CA2AChain',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>Low Credit Warning</h2>
        <p>Hi ${companyName},</p>
        <p>Your verification credits are running low: <strong>${creditsRemaining} remaining</strong></p>
        <p>To avoid service interruption:</p>
        <ul>
          <li>Purchase additional credits in your dashboard</li>
          <li>Or upgrade your subscription tier</li>
        </ul>
        <p>Need help? Contact our support team.</p>
      </div>
    `
  });
};

export const sendDealerMonthlyUsageSummary = async (
  email: string, 
  companyName: string, 
  usageData: { 
    creditsUsed: number; 
    totalVerifications: number; 
    nextBillingDate: string;
  }
) => {
  return await sendEmail(`monthly usage summary to ${email}`, {
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Monthly Usage Summary - CA2AChain',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>Monthly Usage Summary</h2>
        <p>Hi ${companyName},</p>
        <p>Here's your verification activity for this month:</p>
        <ul>
          <li><strong>Credits Used:</strong> ${usageData.creditsUsed}</li>
          <li><strong>Total Verifications:</strong> ${usageData.totalVerifications}</li>
          <li><strong>Next Billing:</strong> ${usageData.nextBillingDate}</li>
        </ul>
        <p>View detailed reports in your dealer dashboard.</p>
      </div>
    `
  });
};