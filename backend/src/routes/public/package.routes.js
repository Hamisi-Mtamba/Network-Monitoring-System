// Import Express
import express from "express";

// Import public package controller
import {
    getPublicPackages
} from "../../controllers/public/package.controller.js";


// Create public package router
const router = express.Router();


// Get public packages belonging to one company
router.get(
    "/companies/:companySlug/packages",
    getPublicPackages
);


// Export router
export default router;