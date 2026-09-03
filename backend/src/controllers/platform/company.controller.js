// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


/* =========================================================
   SHARED HELPERS
   ========================================================= */

// Validate company ID
const parseCompanyId = (value) => {

    const companyId = Number(value);

    if (
        !Number.isInteger(companyId) ||
        companyId <= 0
    ) {
        return null;
    }

    return companyId;
};


// Clean optional text fields
const cleanOptionalText = (value) => {

    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const cleaned = String(value).trim();

    return cleaned || null;
};


// Normalize company slug
const cleanCompanySlug = (value) => {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
};


// Validate standard six-digit hex colors
const isValidHexColor = (value) => {

    return /^#[0-9a-fA-F]{6}$/.test(
        value
    );
};


// Normalize and validate branding settings
const normalizeBranding = (branding) => {

    if (branding === undefined) {

        return {
            valid: true,
            branding: undefined
        };
    }


    if (branding === null) {

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
            message: "Branding must be an object"
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


    for (const field of colorFields) {

        if (branding[field] === undefined) {
            continue;
        }


        if (
            branding[field] === null ||
            String(branding[field]).trim() === ""
        ) {

            normalized[field] = null;

            continue;
        }


        const color =
            String(
                branding[field]
            ).trim();


        if (!isValidHexColor(color)) {

            return {
                valid: false,
                message:
                    `${field} must be a valid 6-digit hex color`
            };
        }


        normalized[field] =
            color.toLowerCase();
    }


    for (const field of imageFields) {

        if (branding[field] === undefined) {
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


// Check whether a company slug already exists
const companySlugExists = async (
    slug,
    excludedCompanyId = null
) => {

    const values = [slug];


    let query = `
        SELECT id
        FROM companies
        WHERE LOWER(slug) = LOWER($1)
    `;


    if (excludedCompanyId !== null) {

        values.push(
            excludedCompanyId
        );

        query += `
            AND id <> $2
        `;
    }


    query += `
        LIMIT 1
    `;


    const result =
        await pool.query(
            query,
            values
        );


    return result.rows.length > 0;
};


/* =========================================================
   GET ALL COMPANIES
   ========================================================= */

const getAllCompanies = async (
    req,
    res
) => {

    try {

        const result =
            await pool.query(
                `
                SELECT
                    c.id,
                    c.name,
                    c.slug,
                    c.logo_url,
                    c.email,
                    c.phone,
                    c.address,
                    c.settings,
                    c.status,
                    c.created_at,
                    c.updated_at,

                    COUNT(
                        DISTINCT a.id
                    ) AS admin_count,

                    COUNT(
                        DISTINCT p.id
                    ) AS package_count,

                    COUNT(
                        DISTINCT pay.id
                    ) AS payment_count

                FROM companies c

                LEFT JOIN admins a
                    ON a.company_id = c.id
                    AND a.role = 'admin'

                LEFT JOIN packages p
                    ON p.company_id = c.id

                LEFT JOIN payments pay
                    ON pay.company_id = c.id

                GROUP BY c.id

                ORDER BY c.id ASC
                `
            );


        const companies =
            result.rows.map(
                (company) => ({

                    ...company,

                    admin_count:
                        Number(
                            company.admin_count
                        ),

                    package_count:
                        Number(
                            company.package_count
                        ),

                    payment_count:
                        Number(
                            company.payment_count
                        )
                })
            );


        return res.status(200).json({
            success: true,
            companies
        });

    } catch (error) {

        console.error(
            "Get companies error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch companies"
        });
    }
};


/* =========================================================
   GET ONE COMPANY
   ========================================================= */

const getCompanyById = async (
    req,
    res
) => {

    try {

        const companyId =
            parseCompanyId(
                req.params.companyId
            );


        if (!companyId) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid company ID"
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
                [companyId]
            );


        if (result.rows.length === 0) {

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
            "Get company error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch company"
        });
    }
};


/* =========================================================
   CREATE COMPANY
   ========================================================= */

const createCompany = async (
    req,
    res
) => {

    try {

        const {
            name,
            slug,
            email,
            phone,
            address,
            logo_url,
            settings,
            branding
        } = req.body;


        if (
            !name ||
            !slug
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Company name and slug are required"
            });
        }


        const cleanName =
            String(name).trim();


        const cleanSlug =
            cleanCompanySlug(
                slug
            );


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


        if (!cleanSlug) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid company slug"
            });
        }


        if (
            await companySlugExists(
                cleanSlug
            )
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "Company slug already exists"
            });
        }


        const brandingResult =
            normalizeBranding(
                branding
            );


        if (!brandingResult.valid) {

            return res.status(400).json({
                success: false,
                message:
                    brandingResult.message
            });
        }


        let cleanSettings = {};


        if (settings !== undefined) {

            if (settings === null) {

                cleanSettings = {};

            } else if (
                typeof settings !== "object" ||
                Array.isArray(settings)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Company settings must be an object"
                });

            } else {

                cleanSettings = {
                    ...settings
                };
            }
        }


        if (
            brandingResult.branding !== undefined
        ) {

            const existingBranding =
                cleanSettings.branding &&
                typeof cleanSettings.branding === "object" &&
                !Array.isArray(
                    cleanSettings.branding
                )
                    ? cleanSettings.branding
                    : {};


            cleanSettings.branding = {

                ...existingBranding,

                ...brandingResult.branding
            };
        }


        const result =
            await pool.query(
                `
                INSERT INTO companies (
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
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7::jsonb,
                    'active',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
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
                    cleanName,

                    cleanSlug,

                    cleanOptionalText(
                        logo_url
                    ) ?? null,

                    cleanOptionalText(
                        email
                    ) ?? null,

                    cleanOptionalText(
                        phone
                    ) ?? null,

                    cleanOptionalText(
                        address
                    ) ?? null,

                    JSON.stringify(
                        cleanSettings
                    )
                ]
            );


        return res.status(201).json({
            success: true,
            message:
                "Company created successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Create company error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to create company"
        });
    }
};


/* =========================================================
   UPDATE COMPANY PROFILE
   ========================================================= */

const updateCompany = async (
    req,
    res
) => {

    try {

        const companyId =
            parseCompanyId(
                req.params.companyId
            );


        if (!companyId) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid company ID"
            });
        }


        const {
            name,
            slug,
            email,
            phone,
            address,
            logo_url
        } = req.body;


        if (
            name === undefined &&
            slug === undefined &&
            email === undefined &&
            phone === undefined &&
            address === undefined &&
            logo_url === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No company information provided"
            });
        }


        const updates = [];

        const values = [];


        const addUpdate = (
            column,
            value
        ) => {

            values.push(value);

            updates.push(
                `${column} = $${values.length}`
            );
        };


        if (name !== undefined) {

            const cleanName =
                String(name).trim();


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


        if (slug !== undefined) {

            const cleanSlug =
                cleanCompanySlug(
                    slug
                );


            if (!cleanSlug) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid company slug"
                });
            }


            if (
                await companySlugExists(
                    cleanSlug,
                    companyId
                )
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Company slug already exists"
                });
            }


            addUpdate(
                "slug",
                cleanSlug
            );
        }


        if (email !== undefined) {

            addUpdate(
                "email",
                cleanOptionalText(
                    email
                )
            );
        }


        if (phone !== undefined) {

            addUpdate(
                "phone",
                cleanOptionalText(
                    phone
                )
            );
        }


        if (address !== undefined) {

            addUpdate(
                "address",
                cleanOptionalText(
                    address
                )
            );
        }


        if (logo_url !== undefined) {

            addUpdate(
                "logo_url",
                cleanOptionalText(
                    logo_url
                )
            );
        }


        values.push(
            companyId
        );


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    ${updates.join(",\n                    ")},
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id =
                    $${values.length}

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


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Company updated successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update company error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to update company"
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
            parseCompanyId(
                req.params.companyId
            );


        if (!companyId) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid company ID"
            });
        }


        const {
            logo_url,
            branding
        } = req.body;


        if (
            logo_url === undefined &&
            branding === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No branding information provided"
            });
        }


        const brandingResult =
            normalizeBranding(
                branding
            );


        if (!brandingResult.valid) {

            return res.status(400).json({
                success: false,
                message:
                    brandingResult.message
            });
        }


        const cleanLogoUrl =
            logo_url === undefined
                ? undefined
                : cleanOptionalText(
                    logo_url
                );


        const brandingPatch =
            brandingResult.branding ??
            {};


        const values = [
            JSON.stringify(
                brandingPatch
            )
        ];


        let logoUpdate = "";


        if (cleanLogoUrl !== undefined) {

            values.push(
                cleanLogoUrl
            );


            logoUpdate = `,
                logo_url = $2`;
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
                        )

                    ${logoUpdate},

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


        if (result.rows.length === 0) {

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
   SUSPEND COMPANY
   ========================================================= */

const suspendCompany = async (
    req,
    res
) => {

    try {

        const companyId =
            parseCompanyId(
                req.params.companyId
            );


        if (!companyId) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid company ID"
            });
        }


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    status = 'suspended',
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
                [companyId]
            );


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Company suspended successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Suspend company error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to suspend company"
        });
    }
};


/* =========================================================
   ACTIVATE COMPANY
   ========================================================= */

const activateCompany = async (
    req,
    res
) => {

    try {

        const companyId =
            parseCompanyId(
                req.params.companyId
            );


        if (!companyId) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid company ID"
            });
        }


        const result =
            await pool.query(
                `
                UPDATE companies

                SET
                    status = 'active',
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
                [companyId]
            );


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        return res.status(200).json({
            success: true,
            message:
                "Company activated successfully",
            company:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Activate company error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to activate company"
        });
    }
};


/* =========================================================
   EXPORT COMPANY CONTROLLERS
   ========================================================= */

export {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    updateCompanyBranding,
    suspendCompany,
    activateCompany
};