const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmail = async ({ to, subject, body }) => {
  try {
    const mailOptions = {
      from: `"WorkFlow Pro" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #1976d2;">${subject}</h2>
          <p>${body}</p>
          <hr/>
          <small style="color: #999;">Sent via WorkFlow Pro</small>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed: ${error.message}`);
    throw new Error(`Email failed: ${error.message}`);
  }
};
