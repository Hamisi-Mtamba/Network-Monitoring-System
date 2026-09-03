// Import Express
import express from "express";

// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";

// Import company administrator authorization middleware
import requireCompanyAdmin from "../../middlewares/requireCompanyAdmin.middleware.js";

// Import report controllers
import {
    getRevenueReport,
    getPaymentReport,
    getSessionReport
} from "../../controllers/admin/report.controller.js";


// Create report router
const router = express.Router();


// Require authentication
router.use(adminAuth);

// Only company admins use these routes
router.use(requireCompanyAdmin);


// Get company revenue report
router.get(
    "/revenue",
    getRevenueReport
);


// Get company payment report
router.get(
    "/payments",
    getPaymentReport
);


// Get company session report
router.get(
    "/sessions",
    getSessionReport
);


// Export router
export default router;