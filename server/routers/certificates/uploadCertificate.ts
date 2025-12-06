import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db, domains, orgDomains, certificates } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { eq, and } from "drizzle-orm";
import { OpenAPITags, registry } from "@server/openApi";

const paramsSchema = z
    .object({
        orgId: z.string(),
        domainId: z.string()
    })
    .strict();

const bodySchema = z
    .object({
        certFile: z.string().min(1, "Certificate file is required"),
        keyFile: z.string().min(1, "Private key file is required")
    })
    .strict();

export type UploadCertificateResponse = {
    domainId: string;
    status: string;
};

registry.registerPath({
    method: "post",
    path: "/org/{orgId}/domain/{domainId}/certificate/upload",
    description: "Upload a custom certificate for a domain.",
    tags: [OpenAPITags.Domain],
    request: {
        params: z.object({
            domainId: z.string(),
            orgId: z.string()
        })
    },
    responses: {}
});

export async function uploadCertificate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = paramsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = bodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { orgId, domainId } = parsedParams.data;
        const { certFile, keyFile } = parsedBody.data;

        // Validate PEM certificate format
        if (!certFile.includes("-----BEGIN CERTIFICATE-----")) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid certificate format. Must be PEM encoded."
                )
            );
        }

        // Validate PEM private key format
        // Supports: RSA (PKCS#1, PKCS#8), ECC (SEC1, PKCS#8)
        const validKeyFormats = [
            "-----BEGIN PRIVATE KEY-----",      // PKCS#8 (RSA or ECC)
            "-----BEGIN RSA PRIVATE KEY-----",  // PKCS#1 RSA
            "-----BEGIN EC PRIVATE KEY-----"    // SEC1 ECC
        ];

        const hasValidKeyFormat = validKeyFormats.some((format) =>
            keyFile.includes(format)
        );

        if (!hasValidKeyFormat) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invalid private key format. Must be PEM encoded (RSA or ECC)."
                )
            );
        }

        // Verify domain belongs to organization
        const [orgDomain] = await db
            .select()
            .from(orgDomains)
            .where(
                and(
                    eq(orgDomains.orgId, orgId),
                    eq(orgDomains.domainId, domainId)
                )
            );

        if (!orgDomain) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Domain not found or does not belong to this organization"
                )
            );
        }

        const [existingDomain] = await db
            .select()
            .from(domains)
            .where(eq(domains.domainId, domainId));

        if (!existingDomain) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, "Domain not found")
            );
        }

        const now = Date.now();

        // Upsert certificate - update if exists, insert if not
        const [existingCert] = await db
            .select()
            .from(certificates)
            .where(eq(certificates.domainId, domainId));

        if (existingCert) {
            await db
                .update(certificates)
                .set({
                    certFile: certFile,
                    keyFile: keyFile,
                    status: "valid",
                    updatedAt: now
                })
                .where(eq(certificates.domainId, domainId));
        } else {
            await db.insert(certificates).values({
                domain: existingDomain.baseDomain,
                domainId: domainId,
                certFile: certFile,
                keyFile: keyFile,
                status: "valid",
                createdAt: now,
                updatedAt: now
            });
        }

        logger.info(`Custom certificate uploaded for domain ${existingDomain.baseDomain}`);

        return response<UploadCertificateResponse>(res, {
            data: {
                domainId: domainId,
                status: "valid"
            },
            success: true,
            error: false,
            message: "Certificate uploaded successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
