// paymentService.js
// FINAL – Firebase Cloud Functions v2 compatible
console.log("🔑 Razorpay KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID);

/* global Razorpay */
  console.log("🔥 FINAL API_BASE USED:", import.meta.env.VITE_API_BASE);

// ✅ API base MUST include /api
const API_BASE = import.meta.env.VITE_API_BASE;
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

if (!API_BASE) {
  throw new Error("❌ VITE_API_BASE is not defined");
}

if (!RAZORPAY_KEY) {
  throw new Error("❌ VITE_RAZORPAY_KEY_ID is not defined");
}

// ✅ Open Razorpay checkout
export const openRazorpayCheckout = (uid, amount = 499) => {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        console.log("💳 Starting payment for UID:", uid);
        console.log("🔗 API_BASE:", API_BASE);

        // 1️⃣ Create order (CORRECT URL)
        const res = await fetch(`${API_BASE}/create-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        });

        if (!res.ok) {
          throw new Error(`Create order failed: ${res.status}`);
        }

        const order = await res.json();
        console.log("✅ Order created:", order);

        if (!order || !order.id) {
          throw new Error("❌ Invalid order received from backend");
        }

        if (typeof window === "undefined" || !window.Razorpay) {
          throw new Error("❌ Razorpay SDK not loaded");
        }

        // 2️⃣ Razorpay options
        const options = {
          key: RAZORPAY_KEY,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          name: "Fees Management System",
          description: "Monthly PRO Subscription – ₹499",

          handler: async function (response) {
            try {
              console.log("✅ Payment success:", response);

              // 3️⃣ Verify payment (BACKEND only updates Firestore)
              const verifyRes = await fetch(`${API_BASE}/verify-payment`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ...response,
                  uid,
                }),
              });

              const verifyResult = await verifyRes.json();

              if (!verifyRes.ok || verifyResult.success !== true) {
                throw new Error("❌ Payment verification failed");
              }

              console.log("🎉 Payment verified & subscription activated");
              resolve(verifyResult);
            } catch (err) {
              console.error("Verification error:", err);
              reject(err);
            }
          },

          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled by user"));
            },
          },

          theme: {
            color: "#667eea",
          },
        };

        // 4️⃣ Open Razorpay checkout
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error("Payment error:", err);
        reject(err);
      }
    })();
  });
};

// ✅ Button click handler
export const handlePaymentClick = async (uid) => {
  try {
    return await openRazorpayCheckout(uid, 499);
  } catch (err) {
    if (err.message === "Payment cancelled by user") {
      console.log("ℹ️ User cancelled payment");
      throw err;
    }
    throw err;
  }
};
