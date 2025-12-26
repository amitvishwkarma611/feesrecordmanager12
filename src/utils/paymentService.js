import { updateSubscriptionOnPaymentSuccess } from '../services/subscriptionService';

// API base URL from environment variables
const API_BASE = import.meta.env.VITE_API_BASE;
if (!API_BASE) {
  throw new Error("VITE_API_BASE is not defined");
}

// Function to open Razorpay checkout
export const openRazorpayCheckout = async (uid, amount = 499) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Call backend to create order via environment-configured API base
      const res = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount })
      });

      if (!res.ok) {
        throw new Error(`Failed to create order: ${res.status} ${res.statusText}`);
      }
      
      const order = await res.json();
      
      // Log received order in console
      console.log("✅ Received order from backend FULL:", JSON.stringify(order, null, 2));

       if (!order || !order.id) {
       console.error("❌ Invalid order received:", order);
       throw new Error("Invalid order object from backend");
      }


      // Check if Razorpay SDK is loaded
      if (!window.Razorpay) {
        console.error('Razorpay SDK not loaded');
        reject(new Error('Razorpay SDK not loaded'));
        return;
      }
         console.log("🧾 Razorpay options about to be used:", {
             key: import.meta.env.VITE_RAZORPAY_KEY_ID,
             amount: order.amount,
             currency: order.currency,
             order_id: order.id,
        });

      // Create Razorpay options with ONLY data from backend
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder', // Use environment variable for key
        amount: order.amount, // Amount from backend order
        currency: order.currency, // Currency from backend order
        order_id: order.id, // Order ID from backend
        name: "Fees Management System",
        description: "Manual Monthly PRO Subscription - ₹499",
        // Remove image/logo property entirely as requested
        handler: async function (response) {
          // This function is called when payment is successful
          console.log('Payment successful:', response);
          
          try {
            // Verify payment with backend
            const verificationResult = await verifyPayment(response);
            console.log('Payment verification result:', verificationResult);
            
            // Update subscription in Firestore to mark as paid
            const result = await updateSubscriptionOnPaymentSuccess(uid, amount);
            console.log('Subscription updated successfully:', result);
            resolve(result);
          } catch (error) {
            console.error('Error in payment processing:', error);
            reject(error);
          }
        },
        prefill: {
          // Prefill user details if available
        },
        theme: {
          color: '#667eea',
        },
        modal: {
          ondismiss: function () {
            // This function is called when the user closes the payment modal
            console.log('Payment modal closed by user');
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      // Initialize and open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      reject(error);
    }
  });
};

// Function to verify payment with backend
export const verifyPayment = async (paymentData) => {
  try {
    const response = await fetch(`${API_BASE}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Payment verification failed');
    }
    
    // Check if backend returned a failure because user already has an active subscription
    if (result.success === false && result.message === 'You already have an active subscription') {
      throw new Error(result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

// Function to handle payment button click
export const handlePaymentClick = async (uid, isPaidUser = false) => {
  // Payment check is now handled in the component, so we allow this to proceed
  // The actual check is done before calling this function
  
  try {
    console.log('Payment button clicked for user:', uid);
    
    // Open Razorpay checkout - this will open immediately as requested
    const result = await openRazorpayCheckout(uid, 499);
    console.log('Payment successful, subscription updated:', result);
    
    // Return success
    return result;
  } catch (error) {
    console.error('Payment failed:', error);
    // Don't throw error if payment was cancelled by user
    if (error.message === 'Payment cancelled by user') {
      console.log('Payment cancelled by user');
      throw error;
    }
    // Re-throw all other errors including 'already has active subscription' error
    throw error;
  }
};