import express from "express";

import adminAuth from "../../middlewares/adminAuth.middleware.js";

import requireCompanyAdmin from "../../middlewares/requireCompanyAdmin.middleware.js";

import {
    getPayments,
    getPaymentById,
    getCashRequests,
    confirmCashPayment,
    markPaymentSuccessful
} from "../../controllers/admin/payment.controller.js";


const router =
    express.Router();


// =========================================================
// AUTHENTICATION + COMPANY ADMIN SCOPE
// =========================================================

router.use(
    adminAuth
);

router.use(
    requireCompanyAdmin
);


// =========================================================
// PAYMENT LIST
// =========================================================

router.get(
    "/",
    getPayments
);


// =========================================================
// CASH PAYMENT REQUESTS
// =========================================================

// Keep this route before "/:id".
router.get(
    "/cash-requests",
    getCashRequests
);


// Company admin confirms that physical cash was received.
router.patch(
    "/cash-requests/:reference/confirm",
    confirmCashPayment
);


// =========================================================
// DEVELOPMENT PAYMENT SIMULATION
// =========================================================

/*
 * Development-only endpoint for simulating successful
 * non-cash payments.
 *
 * The controller must reject cash payments here so cash
 * confirmation cannot bypass the admin approval flow.
 */
router.patch(
    "/:reference/success",
    markPaymentSuccessful
);


// =========================================================
// PAYMENT DETAILS
// =========================================================

// Keep this after all named routes.
router.get(
    "/:id",
    getPaymentById
);


export default router;