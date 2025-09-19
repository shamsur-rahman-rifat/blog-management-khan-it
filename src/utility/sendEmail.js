  import { createTransport } from 'nodemailer';

const sendEmail = async (to, text, subject) => {
    let transporter = createTransport({
      service: 'gmail', // You can use other email providers as well
      auth: {
        user: 'shamsur30rahman@gmail.com', // Your email address
        pass: 'jvdm cnma ydac crfn'   // Your email password (use an app password if using Gmail)
      }
    });
  
    let mailOptions = {
      from: "Article Management System <shamsur30rahman@gmail.com>",
      to: to,
      subject: subject, 
      text: text
    };
  
    return await transporter.sendMail(mailOptions);
}

export default sendEmail;