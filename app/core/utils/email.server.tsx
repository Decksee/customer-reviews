import config from "~/config/config.server";
import { logger } from "./logger.server";
import nodemailer, { type Transporter } from "nodemailer";
import { render } from "@react-email/render";
import { GenericNotifyEmail } from "~/components/email/notify.email";

export class EmailUtils {
  private static instance: EmailUtils;
  private transporter: Transporter;
  private isConnectingToEmailServer = false;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: false,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  public static getInstance(): EmailUtils {
    if (!EmailUtils.instance) {
      EmailUtils.instance = new EmailUtils();
    }
    return EmailUtils.instance;
  }

  /**
   * Setup email server connection.
   * Should be called before sending any email to check if the SMTP options are configured correctly.
   * @param skipEnvs  Environments to skip the connection to email server. Default is ['test']
   * @returns true if connected to email server, false otherwise
   */
  public async connectToEmailServer(
    skipEnvs: string[] = ["test"]
  ): Promise<boolean> {
    if (skipEnvs.includes(config.env)) {
      console.log("Env: " + config.env + " is skipped");
      return true;
    } else {
      try {
        await this.transporter.verify();
        logger.info("🟢 Connected to email server");
        this.isConnectingToEmailServer = true;
        return true;
      } catch (error) {
        logger.warn(
          "🔴 Unable to connect to email server. Make sure you have configured the SMTP options in .env"
        );
        return false;
      }
    }
  }

  /**
   * Securely send email using SMTP server by connecting to the email server if not connected.
   * Will refuse to send email if not connected to email server.
   *
   * @param to Who the email is sent to
   * @param subject Subject of the email
   * @param text If you want to send text email, provide text here
   * @param html If you want to send HTML email, provide HTML here
   * @returns Promise<void>
   */
  public async sendEmail(
    to: string,
    subject: string,
    text?: string,
    html?: string
  ): Promise<void> {
    if (!this.isConnectingToEmailServer) {
      const isConnected = await this.connectToEmailServer();

      if (!isConnected) {
        return;
      }

      this.isConnectingToEmailServer = true;
    }
    const mailOptions = { from: `"Avis Clientèle Val d'Oise" <${config.email.smtp.auth.user}>`, to, subject };

    if (text) {
      Object.assign(mailOptions, { text });
    }
    if (html) {
      Object.assign(mailOptions, { html });
    }
    await this.transporter.sendMail(mailOptions);
  }


  /**
   * Send a generic email to the user with a title, content, and actions buttons
   * 
   * @param to Who the email is sent to
   * @param username Any username to be used in the email to call the user by name. Default is ""
   * @param title The email title which also used as the email subject and preview
   * @param content The email content
   * @param actions The actions buttons to be displayed in the email. An action is a button with a text and a URL
   */
  public async notifyEmail(
    to: string,
    title: string,
    content: string,
    actions: { text: string; url: string }[],
    username: string = ""
  ): Promise<void> {
    const emailHtml = await render(
      <GenericNotifyEmail
        username={username}
        title={title}
        content={content}
        actions={actions}
      />
    );
    const subject = title;
    await this.sendEmail(to, subject, undefined, emailHtml);
  }
}

export default EmailUtils.getInstance();
