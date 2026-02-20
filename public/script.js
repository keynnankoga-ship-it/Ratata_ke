// public/script.js

// Test backend API
async function testApi() {
  try {
    const res = await fetch("/api/hello");
    const data = await res.json();
    console.log("API Response:", data);
    document.getElementById("api-status").textContent = data.message;
  } catch (err) {
    console.error("API Test Failed:", err);
  }
}

// Submit a dummy order
async function submitOrder() {
  const order = {
    email: "test@example.com",
    address: "123 Nairobi St",
    total: 500,
    items: [
      { name: "Burger", price: 200 },
      { name: "Fries", price: 150 },
      { name: "Soda", price: 150 }
    ]
  };

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });
    const data = await res.json();
    console.log("Order Response:", data);
    alert("Order submitted! ID: " + data.orderId);
  } catch (err) {
    console.error("Order Failed:", err);
    alert("Order failed!");
  }
}

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
  testApi();

  const orderBtn = document.getElementById("order-btn");
  if (orderBtn) orderBtn.addEventListener("click", submitOrder);
});