// Load environment variables FIRST
import "dotenv/config";

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PORT } from './src/constants.js';
import { connectDB } from './src/database/database.js';
import packageRoutes from './src/routes/public/package.routes.js';

// Import customer payment routes
import publicPaymentRoutes from "./src/routes/public/payment.routes.js";

// Import path utilities
import path from "path";

// Import public package routes
import publicPackageRoutes from './src/routes/public/package.routes.js';

// Import admin package routes
import adminPackagesRoutes from './src/routes/admin/package.route.js';

// Import admin payment routes
import adminPaymentRoutes from "./src/routes/admin/payment.route.js";

// Import public session routes
import publicSessionRoutes from "./src/routes/public/session.route.js";

// Import admin authentication routes
import adminAuthRoutes from "./src/routes/admin/auth.routes.js";

// Import admin session routes
import adminSessionRoutes from "./src/routes/admin/session.route.js";

// Import admin dashboard routes
import adminDashboardRoutes from "./src/routes/admin/dashboard.route.js";

// Import administrator reports routes
import adminReportRoutes from "./src/routes/admin/report.route.js";

// Import Super Admin routes
import superAdminRoutes from "./src/routes/super-admin/superAdmin.routes.js";

// Import platform-level Superadmin routes
import platformCompanyRoutes from "./src/routes/platform/company.routes.js";

// Import company profile routes
import companyProfileRoutes from "./src/routes/admin/companyProfile.route.js";

// Import public company routes
import publicCompanyRoutes from "./src/routes/public/company.route.js";

// Import company upload error handler
import uploadErrorHandler from "./src/middlewares/uploadError.middleware.js";


const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//Customer-facing package API
app.use('/api/public', publicPackageRoutes);

//Admin package API
app.use('/api/admin/packages', adminPackagesRoutes);

// Public payment APIs used by the captive portal
app.use("/api/public", publicPaymentRoutes);

// Admin payment routes
app.use("/api/admin/payments", adminPaymentRoutes);

// Public session API
app.use("/api/public", publicSessionRoutes);

// Admin authentication API
app.use("/api/admin/auth", adminAuthRoutes);

// Admin session management API
app.use("/api/admin/sessions", adminSessionRoutes);

// Admin dashboard API
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Register administrator reports API
app.use("/api/admin/reports", adminReportRoutes);

// Mount Super Admin management routes
app.use("/api/super-admin", superAdminRoutes);

// Mount platform-level Superadmin routes
app.use("/api/platform", platformCompanyRoutes);

// Mount company profile routes
app.use("/api/admin/company", companyProfileRoutes);

// Mount public company routes
app.use("/api/public", publicCompanyRoutes);

// Handle Multer/file upload errors
app.use(uploadErrorHandler);

// Serve uploaded company images as public static files
app.use(
    "/uploads",
    express.static(
        path.join(
            process.cwd(),
            "uploads"
        )
    )
);

// Routes
app.get('/', (req, res) => {
    res.json({
        message: "Welcome to Internet Monitoring System API is running!"
    });
});

connectDB();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
