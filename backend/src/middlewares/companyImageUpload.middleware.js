// Import multer to handle multipart/form-data image uploads
import multer from "multer";

// Import path utilities for safe file paths
import path from "path";

// Import file-system utilities for creating upload folders
import fs from "fs";

// Import crypto to generate unique file names
import crypto from "crypto";


/* =========================================================
   COMPANY CONTEXT
   ========================================================= */

// Resolve the company that owns the uploaded file
const getUploadCompanyId = (req) => {

    // Superadmin uploads for the explicitly selected company
    if (
        req.admin?.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }


    // Normal admin uploads only for their own company
    return req.admin?.companyId ?? null;
};


// Validate resolved company ID
const getValidUploadCompanyId = (req) => {

    const companyId =
        Number(
            getUploadCompanyId(req)
        );


    if (
        !Number.isInteger(companyId) ||
        companyId <= 0
    ) {
        return null;
    }


    return companyId;
};


/* =========================================================
   SUPPORTED IMAGE TYPES
   ========================================================= */

// MIME types accepted by the system
const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);


// Safe file extension based on MIME type.
//
// We intentionally do not trust the original filename
// extension supplied by the browser.
const mimeExtensions = {

    "image/jpeg": ".jpg",

    "image/png": ".png",

    "image/webp": ".webp"
};


// Branding image purposes supported by the application
const allowedImagePurposes = new Set([
    "logo",
    "background",
    "login",
    "banner"
]);


/* =========================================================
   IMAGE PURPOSE
   ========================================================= */

// Resolve a safe image purpose from the current route
const getImagePurpose = (req) => {

    const requestedType =
        String(
            req.params?.imageType ??
            "image"
        )
            .trim()
            .toLowerCase();


    if (
        allowedImagePurposes.has(
            requestedType
        )
    ) {
        return requestedType;
    }


    /*
     * Some routes may not explicitly set imageType.
     *
     * Fall back to a generic safe name rather than
     * allowing arbitrary route input in the filename.
     */
    return "image";
};


/* =========================================================
   UPLOAD DIRECTORY
   ========================================================= */

// Build one upload directory per company
const getCompanyUploadDirectory = (
    companyId
) => {

    return path.join(
        process.cwd(),
        "uploads",
        "companies",
        String(companyId)
    );
};


/* =========================================================
   MULTER STORAGE
   ========================================================= */

const storage =
    multer.diskStorage({

        // Decide where the uploaded image will be stored
        destination: (
            req,
            file,
            callback
        ) => {

            try {

                const companyId =
                    getValidUploadCompanyId(
                        req
                    );


                if (!companyId) {

                    return callback(
                        new Error(
                            "Company context is required"
                        ),
                        ""
                    );
                }


                const uploadDirectory =
                    getCompanyUploadDirectory(
                        companyId
                    );


                /*
                 * Create the company directory when needed.
                 *
                 * recursive:true also creates missing parent
                 * folders safely.
                 */
                fs.mkdirSync(
                    uploadDirectory,
                    {
                        recursive: true
                    }
                );


                return callback(
                    null,
                    uploadDirectory
                );

            } catch (error) {

                return callback(
                    error,
                    ""
                );
            }
        },


        // Generate a safe server-controlled filename
        filename: (
            req,
            file,
            callback
        ) => {

            try {

                const extension =
                    mimeExtensions[
                        file.mimetype
                    ];


                if (!extension) {

                    return callback(
                        new Error(
                            "Unsupported image format"
                        ),
                        ""
                    );
                }


                const imagePurpose =
                    getImagePurpose(
                        req
                    );


                const uniqueId =
                    crypto.randomUUID();


                const fileName =
                    `${imagePurpose}-${uniqueId}${extension}`;


                return callback(
                    null,
                    fileName
                );

            } catch (error) {

                return callback(
                    error,
                    ""
                );
            }
        }
    });


/* =========================================================
   FILE FILTER
   ========================================================= */

// Allow only supported image MIME types
const fileFilter = (
    req,
    file,
    callback
) => {

    if (
        !allowedMimeTypes.has(
            file.mimetype
        )
    ) {

        return callback(
            new multer.MulterError(
                "LIMIT_UNEXPECTED_FILE",
                "image"
            )
        );
    }


    return callback(
        null,
        true
    );
};


/* =========================================================
   MULTER CONFIGURATION
   ========================================================= */

const companyImageUpload =
    multer({

        storage,

        fileFilter,

        limits: {

            // Maximum image size: 5 MB
            fileSize:
                5 * 1024 * 1024,

            // Only one uploaded file is expected
            files: 1,

            /*
             * Limit extra multipart fields.
             *
             * Current upload endpoints only need
             * the image itself.
             */
            fields: 5,

            // Defensive multipart limit
            parts: 6
        }
    });


/* =========================================================
   EXPORT UPLOADER
   ========================================================= */

export default companyImageUpload;