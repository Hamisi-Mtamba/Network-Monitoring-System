// Import Express
import express from "express";
import { reconnect } from '../../controllers/public/reconnect.controller.js';

// Import public session controller
import {
    getPublicSessionById
} from "../../controllers/public/session.controller.js";


// Create router
const router = express.Router();

router.post('/companies/:companySlug/sessions/reconnect', reconnect);


// Get one public session belonging to one company
router.get(
    "/companies/:companySlug/sessions/:id",
    getPublicSessionById
);


// Export router
export default router;
