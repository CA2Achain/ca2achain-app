import { Resend } from 'resend';

let resend: Resend;

export const initResend = () => {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return resend;
};

export const getResend = () => {
  if (!resend) {
    throw new Error('Resend not initialized. Call initResend() first.');
  }
  return resend;
};

// =============================================
// BUYER EMAIL TEMPLATES
// =============================================

// Send verification started email to buyer
export const sendBuyerVerificationStarted = async (email: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Identity Verification Started - CA2AChain',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2563eb;">Welcome to CA2AChain</h2>
        <p>Thank you for starting the identity verification process. Your verification is being processed by our secure partner, Persona.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">What Happens Next?</h3>
          <ol>
            <li>Complete your identity verification with Persona</li>
            <li>We'll process your information securely</li>
            <li>You'll receive confirmation once approved</li>
            <li>Your identity is then available for age/address verification</li>
          </ol>
        </div>
        
        <p><strong>Privacy Notice:</strong> Your data is encrypted and stored securely. We never share your personal information with third parties.</p>
        <p>Questions? Reply to this email for support.</p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// Send verification complete email to buyer
export const sendBuyerVerificationComplete = async (email: string, expirationDate: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Identity Verification Complete ✅',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #059669;">✅ Verification Complete</h2>
        <p>Great news! Your identity has been successfully verified and secured with zero-knowledge cryptography.</p>
        
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="margin-top: 0; color: #065f46;">Your Benefits</h3>
          <ul>
            <li><strong>Instant Age Verification:</strong> Prove you're 18+ without revealing your birth date</li>
            <li><strong>Address Verification:</strong> Confirm shipping addresses without exposing your street name</li>
            <li><strong>Privacy Protected:</strong> Zero-knowledge proofs keep your data private</li>
            <li><strong>Valid Until:</strong> ${new Date(expirationDate).toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>When making purchases from participating firearm accessory dealers, they can verify your eligibility instantly while keeping your personal information completely private.</p>
        
        <p><a href="${process.env.FRONTEND_URL}/buyer/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #6b7280;">CA2AChain - Privacy-First Identity Verification</p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// Send verification expiration warning to buyer
export const sendBuyerExpirationWarning = async (email: string, expirationDate: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: '⚠️ Identity Verification Expiring Soon',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #d97706;">⚠️ Verification Expiring</h2>
        <p>Your identity verification will expire on <strong>${new Date(expirationDate).toLocaleDateString()}</strong>.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
          <p><strong>What this means:</strong></p>
          <ul>
            <li>After expiration, dealers won't be able to verify your identity</li>
            <li>You'll need to re-verify with an updated ID</li>
            <li>The process takes just a few minutes</li>
          </ul>
        </div>
        
        <p><a href="${process.env.FRONTEND_URL}/buyer/reverify" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Re-Verify Now</a></p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// =============================================
// DEALER EMAIL TEMPLATES
// =============================================

// Send API key to new dealer
export const sendDealerApiKey = async (email: string, apiKey: string, companyName: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Your CA2AChain API Key - Ready for AB 1263 Compliance',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2563eb;">Welcome to CA2AChain, ${companyName}!</h2>
        <p>Your API key has been generated and you're ready to comply with California AB 1263.</p>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your API Key</h3>
          <code style="display: block; padding: 16px; background-color: #1e293b; color: #f8fafc; border-radius: 4px; font-family: monospace; word-break: break-all;">
            ${apiKey}
          </code>
          <p style="margin-bottom: 0;"><strong>⚠️ Important:</strong> Store this securely. You won't be able to see it again.</p>
        </div>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Integration Example</h3>
          <p>Use in your API requests:</p>
          <pre style="background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 14px;">POST /api/verify
Authorization: Bearer ${apiKey}
Content-Type: application/json

{
  "buyer_email": "buyer@example.com",
  "buyer_dob": "1990-01-15",
  "shipping_address": "123 Main St, Los Angeles, CA 90001",
  "transaction_id": "ORDER-123",
  "ab1263_disclosure_presented": true,
  "acknowledgment_received": true
}</pre>
        </div>
        
        <p><a href="${process.env.FRONTEND_URL}/dealer/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a></p>
        <p><a href="${process.env.FRONTEND_URL}/docs" style="color: #2563eb; text-decoration: none;">📖 View API Documentation</a></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #6b7280;">CA2AChain - AB 1263 Compliance Made Simple</p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// Send subscription confirmation to dealer
export const sendDealerSubscriptionConfirmed = async (
  email: string, 
  companyName: string, 
  plan: string, 
  queryLimit: number
) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: `Subscription Confirmed - ${plan} Plan`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #059669;">✅ Subscription Active</h2>
        <p>Thank you ${companyName}! Your ${plan} subscription is now active.</p>
        
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #065f46;">Plan Details</h3>
          <ul>
            <li><strong>Plan:</strong> ${plan}</li>
            <li><strong>Monthly Verifications:</strong> ${queryLimit.toLocaleString()}</li>
            <li><strong>Status:</strong> Active</li>
            <li><strong>Next Billing:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>You can now start verifying customer identities for AB 1263 compliance using our API.</p>
        
        <p><a href="${process.env.FRONTEND_URL}/dealer/dashboard" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Using API</a></p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// Send monthly usage summary to dealer
export const sendDealerUsageSummary = async (
  email: string,
  companyName: string,
  queriesUsed: number,
  queryLimit: number
) => {
  const usagePercentage = Math.round((queriesUsed / queryLimit) * 100);
  
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Monthly Usage Summary - CA2AChain',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2563eb;">Monthly Usage Summary</h2>
        <p>Hi ${companyName}, here's your verification usage for this month:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Usage Stats</h3>
          <div style="background: #e2e8f0; height: 20px; border-radius: 10px; margin: 10px 0;">
            <div style="background: ${usagePercentage > 80 ? '#ef4444' : '#2563eb'}; height: 100%; width: ${usagePercentage}%; border-radius: 10px; min-width: 2px;"></div>
          </div>
          <p><strong>${queriesUsed.toLocaleString()}</strong> of <strong>${queryLimit.toLocaleString()}</strong> verifications used (${usagePercentage}%)</p>
        </div>
        
        ${usagePercentage > 80 ? `
          <div style="background: #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0;"><strong>⚠️ High Usage:</strong> You've used ${usagePercentage}% of your monthly limit. Consider upgrading your plan.</p>
          </div>
        ` : ''}
        
        <p><a href="${process.env.FRONTEND_URL}/dealer/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a></p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// =============================================
// SHARED EMAIL TEMPLATES
// =============================================

// Send data deletion confirmation (CCPA compliance)
export const sendDataDeletionConfirmation = async (email: string, accountType: 'buyer' | 'dealer') => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Data Deletion Confirmation - CA2AChain',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #dc2626;">Data Deletion Complete</h2>
        <p>Your personal information has been permanently deleted from CA2AChain in compliance with CCPA regulations.</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #991b1b;">What Was Deleted</h3>
          <ul>
            <li>All personal identification information</li>
            <li>Verification credentials and proofs</li>
            <li>Account data and preferences</li>
            ${accountType === 'dealer' ? '<li>API keys and access credentials</li>' : ''}
          </ul>
        </div>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
          <p style="margin: 0;"><strong>Note:</strong> Anonymous compliance records remain on the blockchain for legal audit purposes but contain no personally identifiable information.</p>
        </div>
        
        <p>This action cannot be undone. If you need to use our services again, you will need to create a new account and re-verify your identity.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #6b7280;">Thank you for using CA2AChain</p>
      </div>
    `,
  });

  if (error) throw error;
  return data;
};

// Legacy function for backward compatibility
export const sendVerificationComplete = sendBuyerVerificationComplete;
export const sendApiKey = sendDealerApiKey;
export const sendDeletionConfirmation = sendDataDeletionConfirmation;