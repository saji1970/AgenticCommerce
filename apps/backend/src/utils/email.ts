import nodemailer from 'nodemailer';
import { config } from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  if (!config.smtp.user || !config.smtp.pass) {
    console.warn('[Email] SMTP not configured; logging email instead of sending.');
    console.log('[Email] To:', options.to);
    console.log('[Email] Subject:', options.subject);
    console.log('[Email] Body:', options.html);
    return;
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};
