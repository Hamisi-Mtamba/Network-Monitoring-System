// Import Express
import express from "express";

// Import public payment controllers
import {
    initiatePayment,
    createCashPaymentRequest,
    getPaymentStatus
} from "../../controllers/public/payment.controller.js";


// Create public payment router
const router = express.Router();


// Initiate mobile payment for one company
router.post(
    "/companies/:companySlug/payments/initiate",
    initiatePayment
);


// Create cash payment request for one company
router.post(
    "/companies/:companySlug/payments/cash-request",
    createCashPaymentRequest
);


// Check payment status inside one company
router.get(
    "/companies/:companySlug/payments/:reference/status",
    getPaymentStatus
);


// Export router
export default router;