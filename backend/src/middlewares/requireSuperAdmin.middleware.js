// Middleware used to protect platform routes that belong only to Superadmin
const requireSuperAdmin = (req, res, next) => {

    // Stop if authentication middleware did not attach an administrator
    if (!req.admin) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    // Prevent normal company administrators from accessing platform routes
    if (req.admin.role !== "superadmin") {
        return res.status(403).json({
            success: false,
            code: "SUPERADMIN_REQUIRED",
            message: "Access denied"
        });
    }

    // Continue because the authenticated account is the platform Superadmin
    next();
};


// Export Superadmin authorization middleware
export default requireSuperAdmin;