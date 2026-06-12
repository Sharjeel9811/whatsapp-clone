import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text }) => {
  console.log('\n--- Email ---');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Message:', text);

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

      console.log('Email sent successfully to', to);
      return;
    } catch (err) {
      console.log('SMTP failed:', err.message);
      console.log('Falling back to Ethereal...');
    }
  }

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
      console.log('Ethereal preview URL:', previewUrl);
    }
    console.log('Message ID:', info.messageId);
  } catch (err) {
    console.log('Ethereal also failed:', err.message);
    console.log('Use the OTP shown on the verification page instead.');
  }
};

export default sendEmail;
