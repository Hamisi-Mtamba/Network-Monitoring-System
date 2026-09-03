// Import Multer so we can detect upload-specific errors
import multer from "multer";


// Handle image upload errors
const uploadErrorHandler = (
    error,
    req,
    res,
    next
) => {

    // Handle files that exceed the 5 MB limit
    if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
    ) {
        return res.status(400).json({
            success: false,
            message: "Image must not exceed 5 MB"
        });
    }

    // Handle unsupported image types
    if (
        error.message ===
        "Only JPG, PNG and WEBP images are allowed"
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Only JPG, PNG and WEBP images are allowed"
        });
    }

    // Continue unexpected errors to the main error handler
    next(error);
};


// Export upload error middleware
export default uploadErrorHandler;