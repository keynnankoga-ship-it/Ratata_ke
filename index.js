require("dotenv").config();
const express = require("express");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors());

/* =========================
   FRONTEND STATIC FILES
========================= */
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

/* =========================
   ENV VARIABLES
========================= */
const {
  CONSUMER_KEY,
  CONSUMER_SECRET,
  SHORTCODE,
  PASSKEY,
  CALLBACK_URL,
  EMAIL_USER,
  EMAIL_PASS
} = process.env;

/* =========================
   FILE DB
========================= */
const ORDERS_FILE = path.join(__dirname, "orders.json");
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");

/* =========================
   MPESA TOKEN
========================= */
async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

/* =========================
   API ROUTES
========================= */

// Test API
app.get("/api/hello", (req, res) => {
  res.json({ message: "API working 🚀" });
});

// STK Push
app.post("/api/stkpush", async (req, res) => {
  const { phone, amount } = req.body;
  if (!phone || !amount) return res.status(400).json({ error: "Phone & amount required" });

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString("base64");

    const stk = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: CALLBACK_URL,
        AccountReference: "Ratata",
        TransactionDesc: "Ratata Order"
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true, data: stk.data });

  } catch (err) {
    console.log("MPESA ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "MPesa failed" });
  }
});

// Save order
app.post("/api/order", async (req, res) => {
  try {
    const order = req.body;
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));

    order.id = Date.now();
    order.date = new Date().toISOString();
    orders.push(order);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));

    if (EMAIL_USER && EMAIL_PASS) {
      await sendReceipt(order);
    }

    res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.log("ORDER ERROR:", err);
    res.status(500).json({ error: "Order save failed" });
  }
});

// Get all orders
app.get("/api/orders", (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
  res.json(orders);
});

/* =========================
   EMAIL RECEIPT
========================= */
async function sendReceipt(order) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });

  let itemsText = "";
  order.items.forEach(i => (itemsText += `${i.name} - KSh ${i.price}\n`));

  await transporter.sendMail({
    from: EMAIL_USER,
    to: order.email,
    subject: "Ratata Order Receipt",
    text: `Thank you for your Ratata order!\n\n${itemsText}\nTotal: KSh ${order.total}\n\nDelivery to:\n${order.address}\n\nWe are preparing your order.`
  });
}

/* =========================
   CATCH-ALL FRONTEND ROUTE
========================= */
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Ratata server running on port ${PORT}`));