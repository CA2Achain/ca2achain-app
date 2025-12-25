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

// Note: Magic link emails are handled by Supabase Auth automatically
// These are for other transactional emails

// Send verification complete email
export const sendVerificationComplete = async (email: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Identity Verification Complete',
    html: `
      <h2>Verification Complete</h2>
      <p>Your identity has been successfully verified and stored securely.</p>
      <p>Third-party services can now verify your information as needed.</p>
      <p>You can manage your data at any time by visiting your dashboard.</p>
    `,
  });

  if (error) throw error;
  return data;
};

// Send API key to customer
export const sendApiKey = async (email: string, apiKey: string, companyName: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Your CA2AChain API Key',
    html: `
      <h2>Welcome to CA2AChain, ${companyName}!</h2>
      <p>Your API key has been generated:</p>
      <code style="display: block; padding: 16px; background-color: #f5f5f5; border-radius: 4px; font-family: monospace; margin: 16px 0;">
        ${apiKey}
      </code>
      <p><strong>Important:</strong> Store this API key securely. You won't be able to see it again.</p>
      <p>Use this key in the Authorization header of your API requests:</p>
      <code style="display: block; padding: 16px; background-color: #f5f5f5; border-radius: 4px; font-family: monospace;">
        Authorization: Bearer ${apiKey}
      </code>
    `,
  });

  if (error) throw error;
  return data;
};

// Send data deletion confirmation
export const sendDeletionConfirmation = async (email: string) => {
  const { data, error } = await getResend().emails.send({
    from: 'CA2AChain <noreply@ca2achain.com>',
    to: email,
    subject: 'Data Deletion Confirmation',
    html: `
      <h2>Data Deleted</h2>
      <p>Your personal information has been permanently deleted from CA2AChain.</p>
      <p>This action cannot be undone.</p>
      <p>If you need to use our services again, you will need to re-verify your identity.</p>
    `,
  });

  if (error) throw error;
  return data;
};