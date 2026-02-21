// index.js
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files from public/

// ===== STRIPE CARD PAYMENT =====
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Stripe secret key

app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // amount in KES cents
      currency: "kes",
      payment_method_types: ["card"],
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== M-PESA STK PUSH =====
const axios = require("axios");

// Generate MPESA Token
async function getMpesaToken() {
  const auth = Buffer.from(
    process.env.MPESA_CONSUMER_KEY + ":" + process.env.MPESA_CONSUMER_SECRET
  ).toString("base64");

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return response.data.access_token;
}

app.post("/stkpush", async (req, res) => {
  const { phone, amount } = req.body;

  try {
    const token = await getMpesaToken();

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "Ratata",
        TransactionDesc: "Payment",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("MPESA RESPONSE:", response.data);
    res.json(response.data);
  } catch (err) {
    console.error("MPESA ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "STK Push failed" });
  }
});

// ===== ORDER LOGGING =====
app.post("/order", (req, res) => {
  const order = req.body;
  console.log("Order received:", order);
  // Optionally store in DB
  res.json({ message: "Order saved successfully" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Ratata backend running on port ${PORT}`));