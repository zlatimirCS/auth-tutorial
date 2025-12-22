import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const mailtrapClient = new MailtrapClient({
  token: "1d545f61d66376f683fc7e26002db32e", // You can create your API key here https://mailtrap.io/api-tokens
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
