// Import Express Router
import { Router } from "express";

// Import admin login controller
import { loginAdmin, getCurrentAdmin } from "../../controllers/admin/auth.controller.js";

// Import JWT protection middleware
import adminAuth from "../../middlewares/adminAuth.middleware.js";


const router = Router();

// Admin login endpoint
router.post("/login", loginAdmin);

// This route requires a valid admin JWT
router.get("/me", adminAuth, getCurrentAdmin);

export default router;