import * as SendGrid from "@sendgrid/mail"
import config from "../../config";

SendGrid.setApiKey(config.sendgridApiKey)

export const EmailService = {
  async send(recipient: string, subject: string, body: string) {
    console.log(`[EmailService] Sending email to ${recipient} with subject ${subject} and body ${body}`);

    await SendGrid.send({
      to: recipient,
      from: "noreply@urbanbelonging.app",
      subject,
      text: body,
      html: `<p>${body}</p>`
    })
  }
};
