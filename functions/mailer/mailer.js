var nodemailer = require("nodemailer");
var Busboy = require("busboy");

var smtp_host = process.env.SMTP_HOST; // e.g. mail.fidelityltd.co.ke

// One transporter per email account (cPanel requires auth user = from address)
function makeTransporter(user, pass) {
  return nodemailer.createTransport({
    host: smtp_host,
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

// Parse multipart/form-data from a Netlify event
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = {};

    const busboy = Busboy({
      headers: { "content-type": event.headers["content-type"] },
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        files[name] = {
          filename: info.filename,
          mimeType: info.mimeType,
          content: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("finish", () => resolve({ fields, files }));
    busboy.on("error", reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);

    busboy.write(body);
    busboy.end();
  });
}

exports.handler = async function (event, context, callback) {
  var fields = {};
  var files = {};
  var contentType = event.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    ({ fields, files } = await parseMultipart(event));
  } else if (contentType.includes("application/json")) {
    fields = JSON.parse(event.body);
  } else {
    var params = new URLSearchParams(event.body);
    params.forEach((v, k) => (fields[k] = v));
  }

  var { form_type, name, email, phone, job_title, cover_letter, linkedin } = fields;
  var resume = files["resume"] || null; // { filename, mimeType, content }

  if (!email) {
    return callback(null, { statusCode: 400, body: "Missing email address." });
  }

  var adminMail = {};
  var replyMail = {};
  var transporter;

  if (form_type === "local") {
    var careersUser = process.env.CAREERS_USER;
    var careersPass = process.env.CAREERS_PASS;
    transporter = makeTransporter(careersUser, careersPass);

    adminMail = {
      from: `Fidelity Connect <${careersUser}>`,
      to: careersUser,
      subject: `Local Application – ${job_title}`,
      html: `
        <h2>Local Job Application</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Position:</b> ${job_title}</p>
        ${linkedin ? `<p><b>LinkedIn:</b> ${linkedin}</p>` : ""}
        <p><b>Cover Letter:</b><br>${cover_letter}</p>
      `,
      attachments: resume
        ? [{ filename: resume.filename, content: resume.content }]
        : [],
    };
    replyMail = {
      from: `Fidelity Connect <${careersUser}>`,
      to: email,
      subject: `Application Received – ${job_title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Thank you for applying for the <b>${job_title}</b> position at Fidelity Connect.</p>
        <p>We have received your application and our team will review it shortly. If your profile matches our requirements, we will be in touch.</p>
        <br>
        <p>Kind regards,<br><b>Fidelity Connect Careers Team</b><br>${careersUser}</p>
      `,
    };

  } else if (form_type === "international") {
    var clientUser = process.env.CLIENTSERVICE_USER;
    var clientPass = process.env.CLIENTSERVICE_PASS;
    transporter = makeTransporter(clientUser, clientPass);

    adminMail = {
      from: `Fidelity Connect <${clientUser}>`,
      to: clientUser,
      subject: `International Application – ${job_title}`,
      html: `
        <h2>International Job Application</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Position:</b> ${job_title}</p>
        ${linkedin ? `<p><b>LinkedIn:</b> ${linkedin}</p>` : ""}
        <p><b>Cover Letter:</b><br>${cover_letter}</p>
      `,
      attachments: resume
        ? [{ filename: resume.filename, content: resume.content }]
        : [],
    };
    replyMail = {
      from: `Fidelity Connect <${clientUser}>`,
      to: email,
      subject: `Application Received – ${job_title}`,
      html: `
        <p>Dear ${name},</p>
        <p>Thank you for applying for the <b>${job_title}</b> position at Fidelity Connect.</p>
        <p>Please note that a <b>placement fee applies</b> for all international positions. Our client services team will contact you with full details after reviewing your profile.</p>
        <br>
        <p>Kind regards,<br><b>Fidelity Connect Client Services</b><br>${clientUser}</p>
      `,
    };

  } else if (form_type === "newsletter") {
    var itUser = process.env.IT_USER;
    var itPass = process.env.IT_PASS;
    transporter = makeTransporter(itUser, itPass);

    adminMail = {
      from: `Fidelity Connect <${itUser}>`,
      to: itUser,
      subject: `New Newsletter Subscriber – ${email}`,
      html: `<h2>New Newsletter Subscriber</h2><p><b>Email:</b> ${email}</p>`,
    };
    replyMail = {
      from: `Fidelity Connect <${itUser}>`,
      to: email,
      subject: `You're subscribed to Fidelity Connect`,
      html: `
        <p>Hello,</p>
        <p>You have successfully subscribed to the <b>Fidelity Connect newsletter</b>. You will receive updates on the latest job opportunities directly to your inbox.</p>
        <p>You can unsubscribe at any time by replying to this email.</p>
        <br>
        <p>Kind regards,<br><b>Fidelity Connect</b></p>
      `,
    };

  } else {
    return callback(null, { statusCode: 400, body: "Unknown form type." });
  }

  console.log({ form_type, email, resume: resume ? resume.filename : "none" });

  try {
    await Promise.all([
      transporter.sendMail(adminMail),
      transporter.sendMail(replyMail),
    ]);

    callback(null, {
      statusCode: 302,
      headers: { Location: "/thank-you" },
      body: "",
    });
  } catch (error) {
    console.log("Mailer error:", error);
    callback(null, {
      statusCode: 500,
      body: "There was an error sending your submission. Please try again.",
    });
  }
};
