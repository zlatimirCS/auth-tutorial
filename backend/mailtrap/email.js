import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const sendVerificationEmail = async (email, verificationToken) => {
  const recipient = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace(
        "{verificationCode}",
        verificationToken
      ),
      category: "Email verification",
    });
    console.log("Email sent succesfully", response);
  } catch (error) {
    console.log("error", error);
    throw new Error(`Error sending verification email: ${error}`);
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const recipient = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Welcome to our platform email",
      html: `<p>welcome to our platform ${email}, ${name}</p>`,
      category: "Welcome email",
    });
    console.log("Email sent succesfully", response);
  } catch (error) {
    console.log("error", error);
    throw new Error(`Error sending verification email: ${error}`);
  }
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Reset password email",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetUrl),
    });
  } catch (error) {
    console.error("there was an error sending email");
  }
};

export const sendResetSuccessEmail = async (email) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Password reset succesfully",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    });
  } catch (error) {
    console.error("something went wrong");
  }
};
