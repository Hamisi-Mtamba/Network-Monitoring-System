// Import Express to create the Super Admin router
import express from "express";

// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";

// Import Super Admin authorization middleware
import requireSuperAdmin from "../../middlewares/requireSuperAdmin.middleware.js";

// Import Super Admin controller functions
import {
    getAllAdmins,
    getAdminById,
    createAdmin,
    suspendAdmin,
    activateAdmin,
    deleteAdmin,
    changeAdminPassword,
    getSystemStatus,
    suspendSystem,
    activateSystem
} from "../../controllers/super-admin/superAdmin.controller.js";


// Create the router
const router = express.Router();


// Every route below requires a valid authenticated administrator
router.use(adminAuth);

// Every route below also requires the authenticated user to be Super Admin
router.use(requireSuperAdmin);


// =========================
// ADMIN MANAGEMENT ROUTES
// =========================


// Get all normal admins
router.get(
    "/admins",
    getAllAdmins
);


// Get one normal admin
router.get(
    "/admins/:id",
    getAdminById
);


// Create a new normal admin
router.post(
    "/admins",
    createAdmin
);


// Suspend a normal admin
router.patch(
    "/admins/:id/suspend",
    suspendAdmin
);


// Reactivate a normal admin
router.patch(
    "/admins/:id/activate",
    activateAdmin
);


// Change a normal admin password
router.patch(
    "/admins/:id/password",
    changeAdminPassword
);


// Delete a normal admin
router.delete(
    "/admins/:id",
    deleteAdmin
);


// =========================
// SYSTEM CONTROL ROUTES
// =========================


// Get current system status
router.get(
    "/system/status",
    getSystemStatus
);


// Suspend the whole system
router.patch(
    "/system/suspend",
    suspendSystem
);


// Reactivate the whole system
router.patch(
    "/system/activate",
    activateSystem
);


// Export the router
export default router;