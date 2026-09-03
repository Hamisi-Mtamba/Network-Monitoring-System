// Import Express
import express from "express";

// Import public session controller
import {
    getPublicSessionById
} from "../../controllers/public/session.controller.js";


// Create router
const router = express.Router();


// Get one public session belonging to one company
router.get(
    "/companies/:companySlug/sessions/:id",
    getPublicSessionById
);


// Export router
export default router;