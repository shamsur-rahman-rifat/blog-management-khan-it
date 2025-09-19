import { createTransport } from 'nodemailer';

const createMailer = () => {
  return createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

const sendEmail = async (to, subject, text) => {
  const transporter = createMailer();

  const mailOptions = {
    from: "Blog Management System <khanit.srrifat@gmail.com>",
    to,
    subject,
    text,
    // Optional: add html for nicer formatting
    // html: `<p>${text}</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}: ${error.message}`);
  }
};

export default sendEmail;
