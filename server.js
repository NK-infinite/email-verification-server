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
const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

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
    tokens[token] = { 
        email, 
        createdAt: Date.now(),
        verified: false
    };
    
 // Send verification email route mein
const verificationLink = `https://email-verification-server-ii8x.onrender.com/verify-email?token=${token}`;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "Verify your email",
            html: `<p>Click below to verify your email:</p>
                   <a href="${verificationLink}">Verify Email</a>
                   <p>This link will expire in 24 hours.</p>`
        });

        res.json({ 
            ok: true, 
            message: "Verification email sent",
            token: token // Send token back to frontend
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send email" });
    }
});

// Verify token
app.get("/verify-email", (req, res) => {
    const { token } = req.query;
    
    if (!token || !tokens[token]) {
        return res.status(400).json({ error: "Invalid or expired token" });
    }

    const tokenData = tokens[token];
    
    // Check if token expired
    if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY_TIME) {
        delete tokens[token];
        return res.status(400).json({ error: "Token expired" });
    }

    // Mark as verified
    tokens[token].verified = true;
    tokens[token].verifiedAt = Date.now();

    const { email } = tokenData;

    console.log(`Email verified for: ${email}`);
    
    res.json({ 
        verified: true, 
        email, 
        message: `Your email (${email}) has been successfully verified!`,
        token 
    });
});

// Check verification status
app.get("/check-verification", (req, res) => {
    const { token } = req.query;
    
    if (!token || !tokens[token]) {
        return res.json({ verified: false, error: "Invalid token" });
    }

    const tokenData = tokens[token];
    
    // Check if token expired
    if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY_TIME) {
        delete tokens[token];
        return res.json({ verified: false, error: "Token expired" });
    }

    res.json({ 
        verified: tokenData.verified,
        email: tokenData.email
    });
});

// Cleanup expired tokens every hour
setInterval(() => {
    const now = Date.now();
    for (const token in tokens) {
        if (now - tokens[token].createdAt > TOKEN_EXPIRY_TIME) {
            delete tokens[token];
        }
    }
    console.log("Cleaned up expired tokens");
}, 60 * 60 * 1000);

const PORT = 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => console.log(`Server running at http://${HOST}:${PORT}`));