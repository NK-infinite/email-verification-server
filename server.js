require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const tokens = {};

// Nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Send verification email
app.post("/send-verification", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    tokens[token] = { email, createdAt: Date.now() };
    
    const verificationLink = `http://192.168.1.9:3000/verify-email?token=${token}`;

    try {
        await transporter.sendMail({
            from: "nikhilkeshvala1@gmail.com",
            to: email,
            subject: "Verify your email",
            html: `<p>Click below to verify your email:</p>
                   <a href="${verificationLink}">Verify Email</a>`
        });

        res.json({ ok: true, message: "Verification email sent" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send email" });
    }
});

// Verify token
app.get("/verify-email", (req, res) => {
    const { token } = req.query;
    if (!token || !tokens[token]) return res.status(400).send("Invalid or expired token");

    const { email } = tokens[token];

    // Token verified — handle here
    console.log(`Email verified for: ${email}`);
    


    // Send confirmation back to frontend
     res.json({ verified: true, email, message: `Your email (${email}) has been successfully verified!` ,token  });

});


// Cleanup expired tokens every hour (optional)
setInterval(() => {
    const now = Date.now();
    for (const token in tokens) {
        if (now - tokens[token].createdAt > 24 * 60 * 60 * 1000) { // 24h expiry
            delete tokens[token];
        }
    }
}, 60 * 60 * 1000);

const PORT = 3000;
const HOST = "0.0.0.0"

app.listen(PORT, HOST, () => console.log(`Server running at http://${HOST}:${PORT}`));
