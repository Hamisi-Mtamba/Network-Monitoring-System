// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


/* =========================================================
   COMPANY CONTEXT
   ========================================================= */

// Resolve the company managed by the current request
const getRequestCompanyId = (req) => {

    // Superadmin manages the explicitly selected company
    if (
        req.admin?.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }


    // Normal admin always manages their authenticated company
    return req.admin?.companyId ?? null;
};


// Validate resolved company ID
const getValidCompanyId = (req) => {

    const companyId =
        Number(
            getRequestCompanyId(req)
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
   IMAGE URL HELPER
   ========================================================= */

// Build the public URL for an uploaded company image
const buildImageUrl = (
    req,
    companyId
) => {

    return `/uploads/companies/${companyId}/${req.file.filename}`;
};


/* =========================================================
   GET FULL COMPANY
   ========================================================= */

const getCompanyById = async (
    companyId
) => {

    const result =
        await pool.query(
            `
            SELECT
                id,
                name,
                slug,
                logo_url,
                email,
                phone,
                address,
                settings,
                status,
                created_at,
                updated_at
            FROM companies
            WHERE id = $1
            LIMIT 1
            `,
            [
                companyId
            ]
        );


    return result.rows[0] ?? null;
};


/* =========================================================
   UPLOAD COMPANY LOGO
   ========================================================= */

const uploadCompanyLogo = async (
    req,
    res
) => {

    try {

        const companyId =
            getValidCompanyId(req);


        if (!companyId) {

            return res.status(403).json({
                success: false,
                message:
                    "Company context is required"
            });
        }


        if (!req.file) {

            return res.status(400).json({
                success: false,
                message:
                    "Logo image is required"
            });
        }


        const imageUrl =
            buildImageUrl(
                req,
                companyId
            );


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    logo_url = $1,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $2

                RETURNING
                    id,
                    name,
                    slug,
                    logo_url,
                    email,
                    phone,
                    address,
                    settings,
                    status,
                    created_at,
                    updated_at
                `,
                [
                    imageUrl,
                    companyId
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Company logo uploaded successfully",
            image_type:
                "logo",
            image_url:
                imageUrl,
            logo_url:
                imageUrl,
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Upload company logo error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to upload company logo"
        });
    }
};


/* =========================================================
   UPLOAD BRANDING IMAGE
   ========================================================= */

const uploadBrandingImage = async (
    req,
    res
) => {

    try {

        const companyId =
            getValidCompanyId(req);


        if (!companyId) {

            return res.status(403).json({
                success: false,
                message:
                    "Company context is required"
            });
        }


        const imageType =
            String(
                req.params.imageType ?? ""
            )
                .trim()
                .toLowerCase();


        const allowedImageTypes = [
            "background",
            "login",
            "banner"
        ];


        if (
            !allowedImageTypes.includes(
                imageType
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid branding image type"
            });
        }


        if (!req.file) {

            return res.status(400).json({
                success: false,
                message:
                    "Branding image is required"
            });
        }


        const imageUrl =
            buildImageUrl(
                req,
                companyId
            );


        const settingKey =
            `${imageType}_image_url`;


        /*
         * Update only the requested branding image
         * inside settings.branding.
         *
         * jsonb_set preserves all other company settings.
         */
        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    settings =
                        jsonb_set(
                            COALESCE(
                                settings,
                                '{}'::jsonb
                            ),
                            '{branding}',
                            COALESCE(
                                settings->'branding',
                                '{}'::jsonb
                            )
                            ||
                            jsonb_build_object(
                                $1::text,
                                $2::text
                            ),
                            true
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $3

                RETURNING
                    id,
                    name,
                    slug,
                    logo_url,
                    email,
                    phone,
                    address,
                    settings,
                    status,
                    created_at,
                    updated_at
                `,
                [
                    settingKey,
                    imageUrl,
                    companyId
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Branding image uploaded successfully",
            image_type:
                imageType,
            image_url:
                imageUrl,
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Upload branding image error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to upload branding image"
        });
    }
};


/* =========================================================
   REMOVE COMPANY LOGO
   ========================================================= */

const removeCompanyLogo = async (
    req,
    res
) => {

    try {

        const companyId =
            getValidCompanyId(req);


        if (!companyId) {

            return res.status(403).json({
                success: false,
                message:
                    "Company context is required"
            });
        }


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    logo_url = NULL,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1

                RETURNING
                    id,
                    name,
                    slug,
                    logo_url,
                    email,
                    phone,
                    address,
                    settings,
                    status,
                    created_at,
                    updated_at
                `,
                [
                    companyId
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Company logo removed successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Remove company logo error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to remove company logo"
        });
    }
};


/* =========================================================
   REMOVE BRANDING IMAGE
   ========================================================= */

const removeBrandingImage = async (
    req,
    res
) => {

    try {

        const companyId =
            getValidCompanyId(req);


        if (!companyId) {

            return res.status(403).json({
                success: false,
                message:
                    "Company context is required"
            });
        }


        const imageType =
            String(
                req.params.imageType ?? ""
            )
                .trim()
                .toLowerCase();


        const allowedImageTypes = [
            "background",
            "login",
            "banner"
        ];


        if (
            !allowedImageTypes.includes(
                imageType
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid branding image type"
            });
        }


        const settingKey =
            `${imageType}_image_url`;


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    settings =
                        jsonb_set(
                            COALESCE(
                                settings,
                                '{}'::jsonb
                            ),
                            '{branding}',
                            COALESCE(
                                settings->'branding',
                                '{}'::jsonb
                            )
                            ||
                            jsonb_build_object(
                                $1::text,
                                NULL
                            ),
                            true
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $2

                RETURNING
                    id,
                    name,
                    slug,
                    logo_url,
                    email,
                    phone,
                    address,
                    settings,
                    status,
                    created_at,
                    updated_at
                `,
                [
                    settingKey,
                    companyId
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Branding image removed successfully",
            image_type:
                imageType,
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Remove branding image error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to remove branding image"
        });
    }
};


/* =========================================================
   EXPORT COMPANY IMAGE CONTROLLERS
   ========================================================= */

export {
    uploadCompanyLogo,
    uploadBrandingImage,
    removeCompanyLogo,
    removeBrandingImage
};