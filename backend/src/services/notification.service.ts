import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { env } from '../config/env';
import logger from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface SMSOptions {
  to: string;
  message: string;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeTwilioClient();
  }

  private initializeEmailTransporter() {
    if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT),
        secure: parseInt(env.SMTP_PORT) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration not found. Email notifications disabled.');
    }
  }

  private initializeTwilioClient() {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      logger.info('Twilio client initialized');
    } else {
      logger.warn('Twilio configuration not found. SMS notifications disabled.');
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not configured. Email not sent.');
      return false;
    }

    try {
      const info = await this.emailTransporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send an SMS
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.twilioClient || !env.TWILIO_PHONE_NUMBER) {
      logger.warn('Twilio client not configured. SMS not sent.');
      return false;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: env.TWILIO_PHONE_NUMBER,
        to: options.to,
      });

      logger.info(`SMS sent: ${message.sid}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send SMS: ${error.message}`);
      return false;
    }
  }

  // ===== RESERVATION NOTIFICATIONS =====

  async sendReservationConfirmation(data: {
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    reservationId: string;
    pickupLocation: string;
    pickupDatetime: Date;
    dropoffLocation: string;
    totalPrice?: number;
  }): Promise<void> {
    const formattedDate = data.pickupDatetime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email
    await this.sendEmail({
      to: data.customerEmail,
      subject: 'Reservation Confirmed',
      html: `
        <h2>Reservation Confirmed</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your reservation has been confirmed!</p>
        <h3>Reservation Details:</h3>
        <ul>
          <li><strong>Reservation ID:</strong> ${data.reservationId}</li>
          <li><strong>Pickup:</strong> ${data.pickupLocation}</li>
          <li><strong>Dropoff:</strong> ${data.dropoffLocation}</li>
          <li><strong>Date & Time:</strong> ${formattedDate}</li>
          ${data.totalPrice ? `<li><strong>Total Price:</strong> $${data.totalPrice.toFixed(2)}</li>` : ''}
        </ul>
        <p>We look forward to serving you!</p>
        <p>Best regards,<br>Your Chauffeur Service Team</p>
      `,
      text: `Reservation Confirmed\n\nDear ${data.customerName},\n\nYour reservation has been confirmed!\n\nReservation Details:\nReservation ID: ${data.reservationId}\nPickup: ${data.pickupLocation}\nDropoff: ${data.dropoffLocation}\nDate & Time: ${formattedDate}\n${data.totalPrice ? `Total Price: $${data.totalPrice.toFixed(2)}\n` : ''}\nWe look forward to serving you!\n\nBest regards,\nYour Chauffeur Service Team`,
    });

    // Send SMS if phone number provided
    if (data.customerPhone) {
      await this.sendSMS({
        to: data.customerPhone,
        message: `Reservation confirmed! Pickup from ${data.pickupLocation} on ${formattedDate}. Reservation ID: ${data.reservationId}`,
      });
    }
  }

  async sendChauffeurAssignment(data: {
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    chauffeurName: string;
    chauffeurPhone: string;
    vehicleInfo: string;
    pickupDatetime: Date;
    pickupLocation: string;
  }): Promise<void> {
    const formattedDate = data.pickupDatetime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email
    await this.sendEmail({
      to: data.customerEmail,
      subject: 'Chauffeur Assigned to Your Reservation',
      html: `
        <h2>Chauffeur Assigned</h2>
        <p>Dear ${data.customerName},</p>
        <p>A chauffeur has been assigned to your reservation.</p>
        <h3>Chauffeur Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${data.chauffeurName}</li>
          <li><strong>Phone:</strong> ${data.chauffeurPhone}</li>
          <li><strong>Vehicle:</strong> ${data.vehicleInfo}</li>
        </ul>
        <h3>Pickup Information:</h3>
        <ul>
          <li><strong>Location:</strong> ${data.pickupLocation}</li>
          <li><strong>Date & Time:</strong> ${formattedDate}</li>
        </ul>
        <p>Your chauffeur will contact you closer to the pickup time.</p>
        <p>Best regards,<br>Your Chauffeur Service Team</p>
      `,
    });

    // Send SMS
    if (data.customerPhone) {
      await this.sendSMS({
        to: data.customerPhone,
        message: `Chauffeur ${data.chauffeurName} has been assigned to your reservation. Vehicle: ${data.vehicleInfo}. They will contact you soon. Phone: ${data.chauffeurPhone}`,
      });
    }
  }

  async sendTripStatusUpdate(data: {
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    status: string;
    chauffeurName: string;
  }): Promise<void> {
    const statusMessages: Record<string, string> = {
      EN_ROUTE_PICKUP: 'is on the way to pick you up',
      ON_LOCATION: 'has arrived at the pickup location',
      EN_ROUTE_DROPOFF: 'is on the way to your destination',
      COMPLETED: 'has been completed',
    };

    const message = statusMessages[data.status] || 'status updated';

    // Send email
    await this.sendEmail({
      to: data.customerEmail,
      subject: 'Trip Status Update',
      html: `
        <h2>Trip Status Update</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your chauffeur <strong>${data.chauffeurName}</strong> ${message}.</p>
        <p>Best regards,<br>Your Chauffeur Service Team</p>
      `,
    });

    // Send SMS
    if (data.customerPhone) {
      await this.sendSMS({
        to: data.customerPhone,
        message: `Trip Update: Your chauffeur ${data.chauffeurName} ${message}.`,
      });
    }
  }

  async sendReservationCancellation(data: {
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    reservationId: string;
    pickupDatetime: Date;
  }): Promise<void> {
    const formattedDate = data.pickupDatetime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email
    await this.sendEmail({
      to: data.customerEmail,
      subject: 'Reservation Cancelled',
      html: `
        <h2>Reservation Cancelled</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your reservation (ID: ${data.reservationId}) scheduled for ${formattedDate} has been cancelled.</p>
        <p>If you did not request this cancellation, please contact us immediately.</p>
        <p>Best regards,<br>Your Chauffeur Service Team</p>
      `,
    });

    // Send SMS
    if (data.customerPhone) {
      await this.sendSMS({
        to: data.customerPhone,
        message: `Your reservation (${data.reservationId}) for ${formattedDate} has been cancelled.`,
      });
    }
  }

  // ===== CHAUFFEUR NOTIFICATIONS =====

  async sendNewTripAssignment(data: {
    chauffeurEmail: string;
    chauffeurPhone?: string;
    chauffeurName: string;
    reservationId: string;
    customerName: string;
    customerPhone: string;
    pickupLocation: string;
    pickupDatetime: Date;
    dropoffLocation: string;
  }): Promise<void> {
    const formattedDate = data.pickupDatetime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email
    await this.sendEmail({
      to: data.chauffeurEmail,
      subject: 'New Trip Assignment',
      html: `
        <h2>New Trip Assignment</h2>
        <p>Dear ${data.chauffeurName},</p>
        <p>You have been assigned a new trip!</p>
        <h3>Trip Details:</h3>
        <ul>
          <li><strong>Reservation ID:</strong> ${data.reservationId}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Pickup:</strong> ${data.pickupLocation}</li>
          <li><strong>Dropoff:</strong> ${data.dropoffLocation}</li>
          <li><strong>Date & Time:</strong> ${formattedDate}</li>
        </ul>
        <p>Please log in to the app to view full details and accept the assignment.</p>
        <p>Best regards,<br>Dispatch Team</p>
      `,
    });

    // Send SMS
    if (data.chauffeurPhone) {
      await this.sendSMS({
        to: data.chauffeurPhone,
        message: `New trip assigned! Pickup ${data.customerName} from ${data.pickupLocation} on ${formattedDate}. Check app for details.`,
      });
    }
  }

  // ===== PAYMENT NOTIFICATIONS =====

  async sendPaymentConfirmation(data: {
    customerEmail: string;
    customerName: string;
    reservationId: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    // Send email
    await this.sendEmail({
      to: data.customerEmail,
      subject: 'Payment Confirmation',
      html: `
        <h2>Payment Confirmed</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your payment has been successfully processed.</p>
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Reservation ID:</strong> ${data.reservationId}</li>
          <li><strong>Amount:</strong> $${data.amount.toFixed(2)}</li>
          <li><strong>Payment Method:</strong> ${data.paymentMethod}</li>
        </ul>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Your Chauffeur Service Team</p>
      `,
    });
  }

  async sendPaymentReceipt(data: {
    customerEmail: string;
    customerName: string;
    reservationId: string;
    amount: number;
    transactionId: string;
    date: Date;
  }): Promise<void> {
    const formattedDate = data.date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email
    await this.sendEmail({
      to: data.customerEmail,
      subject: 'Payment Receipt',
      html: `
        <h2>Payment Receipt</h2>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for your payment. Here is your receipt:</p>
        <h3>Receipt Details:</h3>
        <ul>
          <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
          <li><strong>Reservation ID:</strong> ${data.reservationId}</li>
          <li><strong>Amount Paid:</strong> $${data.amount.toFixed(2)}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
        </ul>
        <p>Please keep this receipt for your records.</p>
        <p>Best regards,<br>Your Chauffeur Service Team</p>
      `,
    });
  }
}

export const notificationService = new NotificationService();
