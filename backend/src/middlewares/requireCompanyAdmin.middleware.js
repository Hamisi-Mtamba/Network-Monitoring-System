// Middleware used for routes that require a normal company administrator
const requireCompanyAdmin = (req, res, next) => {

    // Stop if authentication middleware did not attach an administrator
    if (!req.admin) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    // Only normal company admins can use these routes
    if (req.admin.role !== "admin") {
        return res.status(403).json({
            success: false,
            code: "COMPANY_ADMIN_REQUIRED",
            message: "Company administrator access required"
        });
    }

    // Every company administrator must have trusted tenant context
    if (!req.admin.companyId) {
        return res.status(403).json({
            success: false,
            code: "COMPANY_REQUIRED",
            message: "Company context is missing"
        });
    }

    // Continue to the requested route
    next();
};

// Export company administrator middleware
export default requireCompanyAdmin;