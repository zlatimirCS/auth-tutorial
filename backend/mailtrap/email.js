import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js";
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
