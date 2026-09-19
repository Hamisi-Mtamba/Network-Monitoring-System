// Import Express
import express from "express";

// Import authentication middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";

// Import company administrator authorization middleware
import requireCompanyAdmin from "../../middlewares/requireCompanyAdmin.middleware.js";

// Import company profile controllers
import {
    getCompanyProfile,
    updateCompanyProfile,
    updateCompanyLogo,
    updateCompanyBranding,
    updateCompanyPaymentSettings
} from "../../controllers/admin/companyProfile.controller.js";

// Import company image upload middleware
import companyImageUpload from "../../middlewares/companyImageUpload.middleware.js";

// Import company image controllers
import {
    uploadCompanyLogo,
    uploadBrandingImage,
    updateBrandingImageRole,
    removeCompanyLogo,
    removeBrandingImage
} from "../../controllers/admin/companyImage.controller.js";


// =========================================================
// CREATE ROUTER
// =========================================================

const router =
    express.Router();


// =========================================================
// AUTHORIZATION
// =========================================================

// Require authentication for every route below
router.use(
    adminAuth
);


// Only normal company administrators use these routes
router.use(
    requireCompanyAdmin
);


// =========================================================
// COMPANY PROFILE
// =========================================================

// Get authenticated company's profile
router.get(
    "/",
    getCompanyProfile
);


// Update authenticated company's profile
router.patch(
    "/",
    updateCompanyProfile
);


// =========================================================
// COMPANY PAYMENT SETTINGS
// =========================================================

// Update authenticated company's Lipa/mobile-money settings
router.patch(
    "/payment-settings",
    updateCompanyPaymentSettings
);


// =========================================================
// COMPANY LOGO
// =========================================================

// Update logo URL manually
router.patch(
    "/logo",
    updateCompanyLogo
);


// Upload authenticated company's main logo
router.post(
    "/logo/upload",

    // Explicitly identify this upload as a logo
    (
        req,
        res,
        next
    ) => {

        req.params.imageType =
            "logo";

        next();
    },

    // Accept one multipart field called "image"
    companyImageUpload.single(
        "image"
    ),

    // Save uploaded image URL to the company
    uploadCompanyLogo
);


// Remove authenticated company's logo
router.delete(
    "/logo",
    removeCompanyLogo
);


// =========================================================
// COMPANY BRANDING
// =========================================================

// Update authenticated company's branding
router.patch(
    "/branding",
    updateCompanyBranding
);


// Upload a background, login, or banner image
router.post(
    "/branding/:imageType/upload",

    // Accept one multipart field called "image"
    companyImageUpload.single(
        "image"
    ),

    // Save uploaded image URL inside settings.branding
    uploadBrandingImage
);


// Remove one branding image
router.delete(
    "/branding/:imageType",
    removeBrandingImage
);


// =========================================================
// EXPORT ROUTER
// =========================================================

router.patch('/branding/:imageType', updateBrandingImageRole);

export default router;