// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


/* =========================================================
   COMPANY CONTEXT
   ========================================================= */

// Resolve the company that the current request is allowed to manage
const getRequestCompanyId = (req) => {

    // Superadmin manages an explicitly selected company
    if (
        req.admin?.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }


    // Normal admin manages only their authenticated company
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
   TEXT HELPERS
   ========================================================= */

// Normalize optional text fields.
//
// undefined = field was not submitted
// null      = clear the database value
// ""        = clear the database value
const cleanOptionalText = (value) => {

    if (value === undefined) {
        return undefined;
    }


    if (value === null) {
        return null;
    }


    const cleaned =
        String(value).trim();


    return cleaned || null;
};


/* =========================================================
   COLOR HELPERS
   ========================================================= */

// Accept three-digit or six-digit hexadecimal colors
const isValidHexColor = (value) => {

    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(
        value
    );
};


// Normalize hex color to lowercase
const normalizeColor = (value) => {

    if (
        value === undefined
    ) {
        return undefined;
    }


    if (
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }


    const cleanValue =
        String(value).trim();


    if (
        !isValidHexColor(
            cleanValue
        )
    ) {
        return false;
    }


    return cleanValue.toLowerCase();
};


/* =========================================================
   BRANDING NORMALIZATION
   ========================================================= */

const normalizeBranding = (
    branding
) => {

    if (
        branding === undefined
    ) {

        return {
            valid: true,
            branding: undefined
        };
    }


    if (
        branding === null
    ) {

        return {
            valid: true,
            branding: {}
        };
    }


    if (
        typeof branding !== "object" ||
        Array.isArray(branding)
    ) {

        return {
            valid: false,
            message:
                "Branding must be an object"
        };
    }


    const colorFields = [
        "primary_color",
        "secondary_color",
        "accent_color",
        "background_color",
        "navbar_color"
    ];


    const imageFields = [
        "background_image_url",
        "login_image_url",
        "banner_image_url"
    ];


    const normalized = {};


    // Normalize colors
    for (
        const field of colorFields
    ) {

        if (
            branding[field] === undefined
        ) {
            continue;
        }


        const color =
            normalizeColor(
                branding[field]
            );


        if (
            color === false
        ) {

            return {
                valid: false,
                message:
                    `${field} must be a valid hex color`
            };
        }


        normalized[field] =
            color;
    }


    // Normalize image URLs
    for (
        const field of imageFields
    ) {

        if (
            branding[field] === undefined
        ) {
            continue;
        }


        normalized[field] =
            cleanOptionalText(
                branding[field]
            );
    }


    return {
        valid: true,
        branding: normalized
    };
};


/* =========================================================
   BRANDING REQUEST COMPATIBILITY
   ========================================================= */

// Resolve branding payload.
//
// Preferred format:
//
// {
//     branding: {
//         primary_color: "..."
//     }
// }
//
// Older flat requests are still accepted:
//
// {
//     primary_color: "..."
// }
const getBrandingPayload = (body) => {

    if (
        body.branding !== undefined
    ) {
        return body.branding;
    }


    const supportedFields = [
        "primary_color",
        "secondary_color",
        "accent_color",
        "background_color",
        "navbar_color",
        "background_image_url",
        "login_image_url",
        "banner_image_url"
    ];


    const branding = {};


    let hasBrandingField =
        false;


    for (
        const field of supportedFields
    ) {

        if (
            body[field] !== undefined
        ) {

            branding[field] =
                body[field];

            hasBrandingField =
                true;
        }
    }


    return hasBrandingField
        ? branding
        : undefined;
};


/* =========================================================
   GET COMPANY PROFILE
   ========================================================= */

const getCompanyProfile = async (
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
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Get company profile error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch company profile"
        });
    }
};


/* =========================================================
   UPDATE COMPANY PROFILE
   ========================================================= */

const updateCompanyProfile = async (
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


        const {
            name,
            email,
            phone,
            address
        } = req.body;


        // Require at least one editable field
        if (
            name === undefined &&
            email === undefined &&
            phone === undefined &&
            address === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No company profile information provided"
            });
        }


        const updates = [];

        const values = [];


        const addUpdate = (
            column,
            value
        ) => {

            values.push(
                value
            );


            updates.push(
                `${column} = $${values.length}`
            );
        };


        // -------------------------------------------------
        // NAME
        // -------------------------------------------------

        if (
            name !== undefined
        ) {

            if (
                typeof name !== "string"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Company name must be a string"
                });
            }


            const cleanName =
                name.trim();


            if (
                cleanName.length < 2 ||
                cleanName.length > 200
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Company name must be between 2 and 200 characters"
                });
            }


            addUpdate(
                "name",
                cleanName
            );
        }


        // -------------------------------------------------
        // EMAIL
        // -------------------------------------------------

        if (
            email !== undefined
        ) {

            addUpdate(
                "email",
                cleanOptionalText(
                    email
                )
            );
        }


        // -------------------------------------------------
        // PHONE
        // -------------------------------------------------

        if (
            phone !== undefined
        ) {

            addUpdate(
                "phone",
                cleanOptionalText(
                    phone
                )
            );
        }


        // -------------------------------------------------
        // ADDRESS
        // -------------------------------------------------

        if (
            address !== undefined
        ) {

            addUpdate(
                "address",
                cleanOptionalText(
                    address
                )
            );
        }


        values.push(
            companyId
        );


        const companyIdParameter =
            `$${values.length}`;


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    ${updates.join(",\n                    ")},
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id =
                    ${companyIdParameter}

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
                values
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
                "Company profile updated successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update company profile error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to update company profile"
        });
    }
};


/* =========================================================
   UPDATE COMPANY LOGO URL
   ========================================================= */

const updateCompanyLogo = async (
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


        if (
            req.body.logo_url === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "logo_url is required"
            });
        }


        const logoUrl =
            cleanOptionalText(
                req.body.logo_url
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
                    logoUrl,
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
                logoUrl
                    ? "Company logo updated successfully"
                    : "Company logo removed successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update company logo error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to update company logo"
        });
    }
};


/* =========================================================
   UPDATE COMPANY BRANDING
   ========================================================= */

const updateCompanyBranding = async (
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


        /*
         * Support both the preferred nested format and
         * legacy flat branding requests.
         */
        const submittedBranding =
            getBrandingPayload(
                req.body
            );


        if (
            submittedBranding === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No branding information provided"
            });
        }


        const brandingResult =
            normalizeBranding(
                submittedBranding
            );


        if (
            !brandingResult.valid
        ) {

            return res.status(400).json({
                success: false,
                message:
                    brandingResult.message
            });
        }


        const brandingPatch =
            brandingResult.branding ??
            {};


        /*
         * Update settings.branding without replacing
         * unrelated settings.
         *
         * Existing branding values remain unless explicitly
         * changed by this request.
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
                            $1::jsonb,

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
                    JSON.stringify(
                        brandingPatch
                    ),
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
                "Company branding updated successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update company branding error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to update company branding"
        });
    }
};


/* =========================================================
   EXPORT PROFILE CONTROLLERS
   ========================================================= */

export {
    getCompanyProfile,
    updateCompanyProfile,
    updateCompanyLogo,
    updateCompanyBranding
};