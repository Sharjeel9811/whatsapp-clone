const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text }) => {
  // Always log to console
  console.log(`\n========================================`);
  console.log(`   📧 EMAIL NOTIFICATION`);
  console.log(`----------------------------------------`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`----------------------------------------`);
  console.log(`   ${text}`);
  console.log(`========================================\n`);

  // Try Gmail SMTP if configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"WhatsApp Clone" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
      });

      console.log(`   ✅ Email sent successfully to ${to}`);
      return;
    } catch (err) {
      console.log(`   ❌ SMTP failed: ${err.message}`);
      console.log(`   ℹ️  Falling back to Ethereal...`);
    }
  }

  // Fallback: Ethereal (usable for development - view in browser)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"WhatsApp Clone" <whatsapp-clone@ethereal.email>',
      to,
      subject,
      text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`   📬 Ethereal preview URL: ${previewUrl}`);
    }
    console.log(`   ℹ️  Message ID: ${info.messageId}`);
  } catch (err) {
    console.log(`   ⚠️  Ethereal also failed: ${err.message}`);
    console.log(`   ℹ️  Use the OTP shown on the verification page instead.`);
  }
};

module.exports = sendEmail;
