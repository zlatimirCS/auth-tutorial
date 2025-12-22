import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const mailtrapClient = new MailtrapClient({
  token: process.env.MAILTRAP_API_KEY, // You can create your API key here https://mailtrap.io/api-tokens
});

export const sender = {
  name: "Mailtrap Test",
  email: "sender@demomailtrap.co",
};

// mailtrap
//   .send({
//     from: { name: "Mailtrap Test", email: "sender@demomailtrap.co" },
//     to: [{ email: "julijanramac@gmail.com" }],
//     subject: "Hello from Mailtrap Node.js",
//     text: "Plain text body",
//   })
//   .then(console.log)
//   .catch(console.error);
