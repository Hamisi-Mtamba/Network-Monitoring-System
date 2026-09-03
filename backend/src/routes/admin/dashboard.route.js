// Import Express
import express from "express";

// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";

// Import company administrator authorization middleware
import requireCompanyAdmin from "../../middlewares/requireCompanyAdmin.middleware.js";

// Import dashboard controller
import {
    getDashboard
} from "../../controllers/admin/dashboard.controller.js";


// Create router
const router = express.Router();


// Require authentication
router.use(adminAuth);

// Only normal company admins use this route
router.use(requireCompanyAdmin);


// Get dashboard statistics for the authenticated company
router.get(
    "/",
    getDashboard
);


// Export router
export default router;