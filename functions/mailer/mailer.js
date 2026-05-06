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

    // Company Footer Template
    const footerHtml = `
      <div style="margin-top: 40px; padding-top: 20px; border-t: 1px solid #eeeeee; font-size: 12px; color: #777777; font-family: sans-serif;">
        <p><b>Fidelity Connect Limited</b><br>
        Kingdom Gardens, Muthaiga Road, Nairobi, Kenya<br>
        Phone: +254 746 690 671 | Email: admin@fidelityltd.co.ke</p>
        <p><i>Your trusted partner for global career and education placement.</i></p>
      </div>
    `;

    if (form_type === "local") {
      transporter = makeTransporter(careersUser, careersPass);
      adminMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: careersUser,
        subject: `Local Application – ${job_title}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #1a6fdb;">New Local Job Application</h2>
            <p>A new application has been submitted for the <b>${job_title}</b> position.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>LinkedIn:</b> ${linkedin || "Not provided"}</p>
            <p><b>Cover Letter:</b></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">${cover_letter}</div>
            ${footerHtml}
          </div>
        `,
        attachments: cv ? [{ filename: cv.filename, content: cv.content }] : [],
      };
      replyMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: email,
        subject: `Application Received – ${job_title}`,
        html: `
          <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1a6fdb;">Application Received</h2>
            <p>Dear ${name},</p>
            <p>Thank you for applying for the <b>${job_title}</b> position at Fidelity Connect.</p>
            <p>Our recruitment team has received your details and will review your profile shortly. We will contact you if your qualifications match the requirements for this role.</p>
            <p>Thank you for choosing Fidelity Connect as your career partner.</p>
            <p>Best regards,<br><b>Fidelity Connect Careers Team</b></p>
            ${footerHtml}
          </div>
        `,
      };

    } else if (form_type === "international") {
      transporter = makeTransporter(clientUser, clientPass);
      adminMail = {
        from: `Fidelity Connect <${clientUser}>`,
        to: clientUser,
        subject: `International Application – ${job_title}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #1a6fdb;">New International Application</h2>
            <p>A new international application has been submitted for <b>${job_title}</b>.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>LinkedIn:</b> ${linkedin || "Not provided"}</p>
            <p><b>Cover Letter:</b></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">${cover_letter}</div>
            ${footerHtml}
          </div>
        `,
        attachments: cv ? [{ filename: cv.filename, content: cv.content }] : [],
      };
      replyMail = {
        from: `Fidelity Connect <${clientUser}>`,
        to: email,
        subject: `Application Received – ${job_title}`,
        html: `
          <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1a6fdb;">Application Received</h2>
            <p>Dear ${name},</p>
            <p>Thank you for applying for the <b>${job_title}</b> position at Fidelity Connect.</p>
            <p style="background: #fff8f1; padding: 15px; border-left: 4px solid #f97316;">
              <b>Important:</b> Please note that a <b>placement fee applies</b> for all international positions. Our client services team will contact you shortly with full details on the process.
            </p>
            <p>Best regards,<br><b>Fidelity Connect Client Services</b></p>
            ${footerHtml}
          </div>
        `,
      };

    } else if (form_type === "employer") {
      transporter = makeTransporter(careersUser, careersPass);
      adminMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: careersUser,
        subject: `Employer Talent Request – ${company}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #1a6fdb;">New Talent Request</h2>
            <p>An employer has requested talent through the website.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><b>Company:</b> ${company}</p>
            <p><b>Contact Person:</b> ${contact_name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>Role Needed:</b> ${role_needed}</p>
            <p><b>Number of Candidates:</b> ${num_candidates || 1}</p>
            <p><b>Requirements:</b></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">${requirements || "No specific requirements provided."}</div>
            ${footerHtml}
          </div>
        `,
      };
      replyMail = {
        from: `Fidelity Connect <${careersUser}>`,
        to: email,
        subject: `Talent Request Received – Fidelity Connect`,
        html: `
          <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1a6fdb;">Talent Request Received</h2>
            <p>Dear ${contact_name},</p>
            <p>Thank you for reaching out to Fidelity Connect. We have received your request for <b>${role_needed}</b> on behalf of <b>${company}</b>.</p>
            <p>Our recruitment team will review your requirements and get back to you within 48 hours to discuss potential candidate matches.</p>
            <p>Best regards,<br><b>Fidelity Connect Careers Team</b></p>
            ${footerHtml}
          </div>
        `,
      };

    } else if (form_type === "newsletter") {
      transporter = makeTransporter(itUser, itPass);
      adminMail = {
        from: `Fidelity Connect <${itUser}>`,
        to: itUser,
        subject: `New Newsletter Subscriber – ${email}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #1a6fdb;">New Subscriber</h2>
            <p>A new user has subscribed to the newsletter: <b>${email}</b></p>
            ${footerHtml}
          </div>
        `,
      };
      replyMail = {
        from: `Fidelity Connect <${itUser}>`,
        to: email,
        subject: `You're subscribed to Fidelity Connect`,
        html: `
          <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1a6fdb;">Welcome to Our Newsletter</h2>
            <p>Hello,</p>
            <p>Thank you for subscribing to the Fidelity Connect newsletter. You will now receive regular updates on new job opportunities, educational placements, and investment insights.</p>
            <p>Best regards,<br><b>Fidelity Connect Team</b></p>
            ${footerHtml}
          </div>
        `,
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
