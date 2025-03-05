// Uses Mailgun to send a verification email to a new user's inbox.
async function sendVerification(mg, name, email, token, type) {
  
  // Token will be checked through single use /verify route
  const verifLink = `https://knightnav.net/api/users/verify?token=${token}&type=${type}`;
  
  // Generate email components based on verification type
  let [subject, text, html] = "";

  if (type == "register") {
    subject = `Hi, ${name}!`;
    text = `Welcome to KnightNav!\n\
Please verify your email to activate your account by clicking here. This link will expire in five minutes.\n\
\n\
If you are receiving this and did not make an account on our site, feel free to ignore this.\
\n\n----\n\n\
Raw verification link:\n\
${verifLink}`;

    html = `<p>Welcome to KnightNav!</p>\
<p>Please verify your email to activate your account by clicking <a href="${verifLink}">here</a>. \
This link will expire in five minutes.</p>\
<p>\n</p>\
<p>If you are receiving this and did not make an account on our site, feel free to ignore this.</p>\
<p>\n----\n</p>\
<p>Raw verification link:</p>\
<p>${verifLink}</p>`;
  }
  
  else if (type == "forgot") {
    subject = `Did you get lost, ${name}?`;
    text = `A request was made to reset your account's password on KnightNav.\n\
If this was done by you, click here to start creating a new password.\n\
Otherwise, you are free to ignore this. This link will expire in five minutes.\
\n\n----\n\n\
Raw verification link:\n\
${verifLink}`;

    html = `<p>A request was made to reset your account's password on KnightNav.</p>\
<p>If this was done by you, click <a href="${verifLink}">here</a> to start creating a new password.</p>\
<p>Otherwise, you are free to ignore this. This link will expire in five minutes.</p>\
<p>\n----\n</p>\
<p>Raw verification link:</p>\
<p>${verifLink}</p>`;
  }

  // Inject generated email components and send it
  try {
    const data = await mg.messages.create("knightnav.net", {
      from: "KnightNav Support <support@knightnav.net>",
      to: [`<${email}>`],
      subject: subject,
      text: text,
      html: html,
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}

module.exports = sendVerification;