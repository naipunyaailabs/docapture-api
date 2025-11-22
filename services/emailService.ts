import nodemailer from 'nodemailer';
import { createErrorResponse } from '../utils/errorHandler';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private constructor() {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = (process.env.SMTP_SECURE === 'true') || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const options: any = { host, port, secure };
    if (user && pass) options.auth = { user, pass };
    if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') options.tls = { rejectUnauthorized: false };
    this.transporter = nodemailer.createTransport(options);
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      try { await this.transporter.verify(); } catch (_) {}
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"Docapture" <admin@docapture.com>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
    
    const text = `Please verify your email by clicking the following link: ${verificationUrl}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p>Hello,</p>
        <p>Thank you for registering with Docapture. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #fbbf24; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;
                    font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>If you didn't create an account with Docapture, you can safely ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          This email was sent to ${email}. If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Verify your Docapture account',
      text,
      html,
    });
  }

  async sendPasswordResetEmail(email: string, userId: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?userId=${encodeURIComponent(userId)}&secret=${encodeURIComponent(resetToken)}`;
    const text = `Reset your password using the following link: ${resetUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset your password</h2>
        <p>Hello,</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #fbbf24; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;
                    font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          This email was sent to ${email}.
        </p>
      </div>
    `;
    return await this.sendEmail({
      to: email,
      subject: 'Reset your Docapture password',
      text,
      html,
    });
  }
}

export default EmailService.getInstance();