// Import Express
import express from "express";

// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";

// Import company admin authorization middleware
import requireCompanyAdmin from "../../middlewares/requireCompanyAdmin.middleware.js";

// Import package controller functions
import {
    getPackages,
    getPackageById,
    createPackage,
    updatePackage,
    updatePackageStatus,
    updatePackageSchedule,
    deletePackage
} from "../../controllers/admin/package.controller.js";


// Create package router
const router = express.Router();


// Every package management route requires authentication
router.use(adminAuth);

// Every route here belongs to a company administrator
router.use(requireCompanyAdmin);


// Get all packages for the authenticated company
router.get(
    "/",
    getPackages
);


// Get one package
router.get(
    "/:id",
    getPackageById
);


// Create package
router.post(
    "/",
    createPackage
);


// Update package
router.patch(
    "/:id",
    updatePackage
);


// Change active status
router.patch(
    "/:id/status",
    updatePackageStatus
);


// Change availability schedule
router.patch(
    "/:id/schedule",
    updatePackageSchedule
);


// Delete package
router.delete(
    "/:id",
    deletePackage
);


// Export package router
export default router;