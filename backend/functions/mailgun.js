// Uses Mailgun to send an email to a new user's inbox.
// The email itself contains nothing meaningful, yet.
async function sendSimpleMessage(mg, name, email) {
  try {
    const data = await mg.messages.create("support.knightnav.net", {
      from: "KnightNav Support <accounts@support.knightnav.net>",
      to: [`<${email}>`],
      subject: `Hi, ${name}!`,
      text: "Welcome to KnightNav! Please verify your email to activate your account.",
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}

module.exports = sendSimpleMessage;