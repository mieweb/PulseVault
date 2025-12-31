import { sendEmail } from "./sendEmail";

export const sendVerificationEmail = async ({ user, url }: { user: {email: string, name: string}, url: string }) => {
return sendEmail({
    to: user.email,
    subject: "Email Verification",
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px;">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #1a1a1a;">
                    Pulse<span style="color: #d32f2f;">Vault</span>
                  </h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
                    Hello ${user.name},
                  </p>
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                    Please verify your email address to complete your account setup.
                  </p>
                  <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                    Click the button below to verify your email address:
                  </p>
                  <!-- Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px;">
                        <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #1a1b3d; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                          Verify Email
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0 0 30px; font-size: 14px; line-height: 1.6; color: #1a1b3d; word-break: break-all;">
                    ${url}
                  </p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                    If you did not request an email verification, please ignore this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                    Thank you,
                  </p>
                  <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                    Pulse<span style="color: #d32f2f;">Vault</span> Team
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
    text: `
    Hello ${user.name},
    Please verify your email address to complete your account setup.
    Click the link below to verify your email:
    ${url}
    If you did not request an email verification, please ignore this email.
    Thank you,
    PulseVault
    `,
  });

}