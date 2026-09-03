// Import Express
import express from "express";

// Import public company controller
import {
    getPublicCompanyProfile
} from "../../controllers/public/company.controller.js";


// Create router
const router = express.Router();


// Get one active company's public profile
router.get(
    "/companies/:companySlug",
    getPublicCompanyProfile
);


// Export router
export default router;