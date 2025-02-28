// Uses Mailgun to send a verification email to a new user's inbox.
async function sendVerification(mg, name, email, token) {
  
  // Token will be checked through single use /verify route
  const verifLink = `https://knightnav.net/users/verify?token=${token}`;
  
  try {
    const data = await mg.messages.create("knightnav.net", {
      from: "KnightNav Support <support@knightnav.net>",
      to: [`<${email}>`],
      subject: `Hi, ${name}!`,
      text: "Welcome to KnightNav! Please verify your email to activate your account by clicking here.",
      html: `<p>Welcome to KnightNav!\ 
Please verify your email to activate your account by clicking <a href="${verifLink}">here</a>.</p>`
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}

module.exports = sendVerification;