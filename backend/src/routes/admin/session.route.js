// Import Express
import express from "express";

// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";

// Import company administrator authorization middleware
import requireCompanyAdmin from "../../middlewares/requireCompanyAdmin.middleware.js";

// Import session controllers
import {
    getSessions,
    getSessionById,
    updateSessionStatus
} from "../../controllers/admin/session.controller.js";


// Create router
const router = express.Router();


// Require authentication for every session route
router.use(adminAuth);

// Only normal company admins use these routes
router.use(requireCompanyAdmin);


// Get all sessions belonging to the authenticated company
router.get(
    "/",
    getSessions
);


// Get one session belonging to the authenticated company
router.get(
    "/:id",
    getSessionById
);


// Update one session belonging to the authenticated company
router.patch(
    "/:id/status",
    updateSessionStatus
);


// Export router
export default router;