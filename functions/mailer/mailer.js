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
  let fields = {};
  let files = {};
  const contentType = event.headers["content-type"] || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      ({ fields, files } = await parseMultipart(event));
    } else if (contentType.includes("application/json")) {
      const rawBodyStr = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
      fields = JSON.parse(rawBodyStr);
    } else {
      const rawBodyStr = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
      const params = new URLSearchParams(rawBodyStr);
      params.forEach((v, k) => (fields[k] = v));
    }

    let { form_type, fn, ln, name, email, phone, job_title, cover_letter, linkedin, contact_name, company, role_needed, num_candidates, requirements } = fields;
    name = name || (fn && ln ? fn + " " + ln : null) || contact_name;
    const cv = files["cv"] || files["resume"] || null;

    if (!email) {
      return callback(null, { statusCode: 400, body: "Email address is required." });
    }

    let adminMail = {};
    let replyMail = {};
    let transporter;

    // Load credentials based on form type
    const careersUser = process.env.CAREERS_USER;
    const careersPass = process.env.CAREERS_PASS;
    const clientUser = process.env.CLIENTSERVICE_USER;
    const clientPass = process.env.CLIENTSERVICE_PASS;
    const itUser = process.env.IT_USER || careersUser;
    const itPass = process.env.IT_PASS || careersPass;

    if (form_type === "local") {
      transporter = makeTransporter(careersUser, careersPass);
      adminMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: careersUser,
        subject: `Local Application – ${job_title}`,
        html: `<h2>Local Job Application</h2><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Position:</b> ${job_title}</p>${linkedin ? `<p><b>LinkedIn:</b> ${linkedin}</p>` : ""}<p><b>Cover Letter:</b><br>${cover_letter}</p>`,
        attachments: cv ? [{ filename: cv.filename, content: cv.content }] : [],
      };
      replyMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: email,
        subject: `Application Received – ${job_title}`,
        html: `<p>Dear ${name},</p><p>Thank you for applying for the <b>${job_title}</b> position at Fidelity Connect.</p><p>We have received your application and our team will review it shortly.</p><br><p>Kind regards,<br><b>Fidelity Connect Careers Team</b></p>`,
      };

    } else if (form_type === "international") {
      transporter = makeTransporter(clientUser, clientPass);
      adminMail = {
        from: `Fidelity Connect <${clientUser}>`,
        to: clientUser,
        subject: `International Application – ${job_title}`,
        html: `<h2>International Job Application</h2><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Position:</b> ${job_title}</p>${linkedin ? `<p><b>LinkedIn:</b> ${linkedin}</p>` : ""}<p><b>Cover Letter:</b><br>${cover_letter}</p>`,
        attachments: cv ? [{ filename: cv.filename, content: cv.content }] : [],
      };
      replyMail = {
        from: `Fidelity Connect <${clientUser}>`,
        to: email,
        subject: `Application Received – ${job_title}`,
        html: `<p>Dear ${name},</p><p>Thank you for applying for the <b>${job_title}</b> position at Fidelity Connect.</p><p>Please note that a <b>placement fee applies</b> for all international positions. Our team will contact you shortly.</p><br><p>Kind regards,<br><b>Fidelity Connect Client Services</b></p>`,
      };

    } else if (form_type === "employer") {
      transporter = makeTransporter(careersUser, careersPass);
      adminMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: careersUser,
        subject: `Employer Talent Request – ${company}`,
        html: `<h2>Employer Talent Request</h2><p><b>Company:</b> ${company}</p><p><b>Contact Person:</b> ${contact_name}</p><p><b>Email:</b> ${email}</p><p><b>Phone:</b> ${phone}</p><p><b>Role Needed:</b> ${role_needed}</p><p><b>No. of Candidates:</b> ${num_candidates || 1}</p>${requirements ? `<p><b>Requirements:</b><br>${requirements}</p>` : ""}`,
      };
      replyMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: email,
        subject: `Talent Request Received – Fidelity Connect`,
        html: `<p>Dear ${contact_name},</p><p>Thank you for submitting a talent request for <b>${role_needed}</b>.</p><p>Our recruitment team will review your requirements and get back to you within 48 hours.</p><br><p>Kind regards,<br><b>Fidelity Connect Careers Team</b></p>`,
      };

    } else if (form_type === "newsletter") {
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
        html: `<p>Hello,</p><p>You have successfully subscribed to the <b>Fidelity Connect newsletter</b>.</p><p>Kind regards,<br><b>Fidelity Connect</b></p>`,
      };

    } else {
      return callback(null, { statusCode: 400, body: "Unknown form type." });
    }

    console.log(`Sending ${form_type} email for ${email}...`);
    
    await Promise.all([
      transporter.sendMail(adminMail),
      transporter.sendMail(replyMail),
    ]);

    return callback(null, {
      statusCode: 302,
      headers: { Location: "/thank-you" },
      body: "",
    });

  } catch (error) {
    console.error("Mailer error:", error);
    return callback(null, {
      statusCode: 500,
      body: `There was an error processing your submission. Please try again later. (${error.message})`,
    });
  }
};
