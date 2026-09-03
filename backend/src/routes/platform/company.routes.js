// Import Express to create platform routes
import express from "express";


// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";


// Import Superadmin authorization middleware
import requireSuperAdmin from "../../middlewares/requireSuperAdmin.middleware.js";


// Import platform company context middleware
import platformCompanyContext from "../../middlewares/platformCompanyContext.middleware.js";


// =========================================================
// PLATFORM DASHBOARD CONTROLLER
// =========================================================

import {
    getPlatformDashboard
} from "../../controllers/platform/dashboard.controller.js";


// =========================================================
// SHARED COMPANY DASHBOARD CONTROLLER
// =========================================================

import {
    getDashboard
} from "../../controllers/admin/dashboard.controller.js";


// =========================================================
// SHARED REPORT CONTROLLERS
// =========================================================

import {
    getRevenueReport,
    getPaymentReport,
    getSessionReport
} from "../../controllers/admin/report.controller.js";


// =========================================================
// SHARED SESSION CONTROLLERS
// =========================================================

import {
    getSessions,
    getSessionById,
    updateSessionStatus
} from "../../controllers/admin/session.controller.js";


// =========================================================
// PLATFORM PAYMENT READ CONTROLLERS
// =========================================================

import {
    getCompanyPayments,
    getCompanyPaymentById
} from "../../controllers/platform/companyPayment.controller.js";


// =========================================================
// SHARED PAYMENT ACTION CONTROLLERS
// =========================================================

import {
    getCashRequests,
    confirmCashPayment,
    markPaymentSuccessful
} from "../../controllers/admin/payment.controller.js";


// =========================================================
// PLATFORM COMPANY CONTROLLERS
// =========================================================

import {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    updateCompanyBranding as updatePlatformCompanyBranding,
    suspendCompany,
    activateCompany
} from "../../controllers/platform/company.controller.js";


// =========================================================
// PLATFORM COMPANY ADMIN CONTROLLERS
// =========================================================

import {
    getCompanyAdmins,
    createCompanyAdmin,
    updateCompanyAdmin,
    changeCompanyAdminPassword,
    suspendCompanyAdmin,
    activateCompanyAdmin,
    deleteCompanyAdmin
} from "../../controllers/platform/companyAdmin.controller.js";


// =========================================================
// PLATFORM COMPANY PACKAGE CONTROLLERS
// =========================================================

import {
    getCompanyPackages,
    createCompanyPackage,
    updateCompanyPackage,
    updateCompanyPackageStatus,
    updateCompanyPackageSchedule,
    deleteCompanyPackage
} from "../../controllers/platform/companyPackage.controller.js";


// =========================================================
// SHARED COMPANY PROFILE CONTROLLERS
// =========================================================

import {
    getCompanyProfile,
    updateCompanyProfile,
    updateCompanyLogo,
    updateCompanyBranding as updateCompanyProfileBranding
} from "../../controllers/admin/companyProfile.controller.js";


// =========================================================
// COMPANY IMAGE UPLOAD MIDDLEWARE
// =========================================================

import companyImageUpload from "../../middlewares/companyImageUpload.middleware.js";


// =========================================================
// COMPANY IMAGE CONTROLLERS
// =========================================================

import {
    uploadCompanyLogo,
    uploadBrandingImage,
    removeCompanyLogo,
    removeBrandingImage
} from "../../controllers/admin/companyImage.controller.js";


// =========================================================
// CREATE ROUTER
// =========================================================

const router =
    express.Router();


// =========================================================
// PLATFORM AUTHORIZATION
// =========================================================

// Every route below requires an authenticated administrator
router.use(
    adminAuth
);


// Every route below is restricted to Superadmin
router.use(
    requireSuperAdmin
);


// =========================================================
// PLATFORM DASHBOARD
// =========================================================

// Get platform-wide statistics
router.get(
    "/dashboard",
    getPlatformDashboard
);


// =========================================================
// COMPANY MANAGEMENT
// =========================================================

// Get every company
router.get(
    "/companies",
    getAllCompanies
);


// Create a company
router.post(
    "/companies",
    createCompany
);


// Get one company
router.get(
    "/companies/:companyId",
    getCompanyById
);


// Update basic company information
router.patch(
    "/companies/:companyId",
    updateCompany
);


// Update company branding directly through platform controller
router.patch(
    "/companies/:companyId/branding",
    updatePlatformCompanyBranding
);


// Suspend a company
router.patch(
    "/companies/:companyId/suspend",
    suspendCompany
);


// Reactivate a company
router.patch(
    "/companies/:companyId/activate",
    activateCompany
);


// =========================================================
// COMPANY ADMIN MANAGEMENT
// =========================================================

// Get all administrators belonging to one company
router.get(
    "/companies/:companyId/admins",
    getCompanyAdmins
);


// Create an administrator for one company
router.post(
    "/companies/:companyId/admins",
    createCompanyAdmin
);


// Update one company administrator
router.patch(
    "/companies/:companyId/admins/:adminId",
    updateCompanyAdmin
);


// Change administrator password
router.patch(
    "/companies/:companyId/admins/:adminId/password",
    changeCompanyAdminPassword
);


// Suspend administrator
router.patch(
    "/companies/:companyId/admins/:adminId/suspend",
    suspendCompanyAdmin
);


// Activate administrator
router.patch(
    "/companies/:companyId/admins/:adminId/activate",
    activateCompanyAdmin
);


// Delete administrator
router.delete(
    "/companies/:companyId/admins/:adminId",
    deleteCompanyAdmin
);


// =========================================================
// COMPANY PACKAGE MANAGEMENT
// =========================================================

// Get all packages for one company
router.get(
    "/companies/:companyId/packages",
    getCompanyPackages
);


// Create a package for one company
router.post(
    "/companies/:companyId/packages",
    createCompanyPackage
);


// Update one package
router.patch(
    "/companies/:companyId/packages/:packageId",
    updateCompanyPackage
);


// Activate or deactivate one package
router.patch(
    "/companies/:companyId/packages/:packageId/status",
    updateCompanyPackageStatus
);


// Update package availability schedule
router.patch(
    "/companies/:companyId/packages/:packageId/schedule",
    updateCompanyPackageSchedule
);


// Delete package
router.delete(
    "/companies/:companyId/packages/:packageId",
    deleteCompanyPackage
);


// =========================================================
// COMPANY PAYMENT MANAGEMENT
// =========================================================

// Get all payments for selected company
router.get(
    "/companies/:companyId/payments",

    platformCompanyContext,

    getCompanyPayments
);


// Get pending cash-payment requests
router.get(
    "/companies/:companyId/payments/cash-requests",

    platformCompanyContext,

    getCashRequests
);


// Confirm a cash-payment request
router.patch(
    "/companies/:companyId/payments/cash-requests/:reference/confirm",

    platformCompanyContext,

    confirmCashPayment
);


// Development/testing endpoint for marking payment successful
router.patch(
    "/companies/:companyId/payments/:reference/success",

    platformCompanyContext,

    markPaymentSuccessful
);


// Get one payment
router.get(
    "/companies/:companyId/payments/:paymentId",

    platformCompanyContext,

    getCompanyPaymentById
);


// =========================================================
// COMPANY SESSION MANAGEMENT
// =========================================================

// Get all internet sessions for one company
router.get(
    "/companies/:companyId/sessions",

    platformCompanyContext,

    getSessions
);


// Get one internet session
router.get(
    "/companies/:companyId/sessions/:id",

    platformCompanyContext,

    getSessionById
);


// Change internet-session status
router.patch(
    "/companies/:companyId/sessions/:id/status",

    platformCompanyContext,

    updateSessionStatus
);


// =========================================================
// COMPANY DASHBOARD
// =========================================================

// Get selected company dashboard
router.get(
    "/companies/:companyId/dashboard",

    platformCompanyContext,

    getDashboard
);


// =========================================================
// COMPANY REPORTS
// =========================================================

// Get revenue report
router.get(
    "/companies/:companyId/reports/revenue",

    platformCompanyContext,

    getRevenueReport
);


// Get payment report
router.get(
    "/companies/:companyId/reports/payments",

    platformCompanyContext,

    getPaymentReport
);


// Get session report
router.get(
    "/companies/:companyId/reports/sessions",

    platformCompanyContext,

    getSessionReport
);


// =========================================================
// COMPANY PROFILE
// =========================================================

// Get full company profile
router.get(
    "/companies/:companyId/profile",

    platformCompanyContext,

    getCompanyProfile
);


// Update company profile
router.patch(
    "/companies/:companyId/profile",

    platformCompanyContext,

    updateCompanyProfile
);


// =========================================================
// COMPANY LOGO
// =========================================================

// Update logo URL manually
router.patch(
    "/companies/:companyId/profile/logo",

    platformCompanyContext,

    updateCompanyLogo
);


// Upload company logo image
router.post(
    "/companies/:companyId/profile/logo/upload",

    platformCompanyContext,

    (
        req,
        res,
        next
    ) => {

        req.params.imageType =
            "logo";

        next();
    },

    companyImageUpload.single(
        "image"
    ),

    uploadCompanyLogo
);


// Remove company logo
router.delete(
    "/companies/:companyId/profile/logo",

    platformCompanyContext,

    removeCompanyLogo
);


// =========================================================
// COMPANY BRANDING
// =========================================================

// Update company branding through shared profile controller
router.patch(
    "/companies/:companyId/profile/branding",

    platformCompanyContext,

    updateCompanyProfileBranding
);


// Upload background, login or banner image
router.post(
    "/companies/:companyId/profile/branding/:imageType/upload",

    platformCompanyContext,

    companyImageUpload.single(
        "image"
    ),

    uploadBrandingImage
);


// Remove background, login or banner image
router.delete(
    "/companies/:companyId/profile/branding/:imageType",

    platformCompanyContext,

    removeBrandingImage
);


// =========================================================
// EXPORT PLATFORM ROUTER
// =========================================================

export default router;