"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    InfoSection,
    InfoSectionContent,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";
import { useTranslations } from "next-intl";
import { Badge } from "./ui/badge";

type DomainInfoCardProps = {
    failed: boolean;
    verified: boolean;
    type: string | null;
    certificateStatus?: string | null;
};

export default function DomainInfoCard({
    failed,
    verified,
    type,
    certificateStatus
}: DomainInfoCardProps) {
    const t = useTranslations();

    const getTypeDisplay = (type: string) => {
        switch (type) {
            case "ns":
                return t("selectDomainTypeNsName");
            case "cname":
                return t("selectDomainTypeCnameName");
            case "wildcard":
                return t("selectDomainTypeWildcardName");
            default:
                return type;
        }
    };

    const getCertBadge = () => {
        if (!certificateStatus) {
            return (
                <Badge variant="outline">
                    {t("none", { fallback: "None" })}
                </Badge>
            );
        }
        switch (certificateStatus) {
            case "valid":
                return (
                    <Badge variant="green">
                        {t("valid", { fallback: "Valid" })}
                    </Badge>
                );
            case "pending":
            case "requested":
                return (
                    <Badge variant="yellow">
                        {t("pending", { fallback: "Pending" })}
                    </Badge>
                );
            case "expired":
            case "failed":
                return (
                    <Badge variant="red">
                        {t(certificateStatus, { fallback: certificateStatus.charAt(0).toUpperCase() + certificateStatus.slice(1) })}
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline">
                        {certificateStatus}
                    </Badge>
                );
        }
    };

    return (
        <Alert>
            <AlertDescription>
                <InfoSections cols={3}>
                    <InfoSection>
                        <InfoSectionTitle>{t("type")}</InfoSectionTitle>
                        <InfoSectionContent>
                            <span>{getTypeDisplay(type ? type : "")}</span>
                        </InfoSectionContent>
                    </InfoSection>
                    <InfoSection>
                        <InfoSectionTitle>{t("status")}</InfoSectionTitle>
                        <InfoSectionContent>
                            {failed ? (
                                <Badge variant="red">
                                    {t("failed", { fallback: "Failed" })}
                                </Badge>
                            ) : verified ? (
                                type === "wildcard" ? (
                                    <Badge variant="outlinePrimary">
                                        {t("manual", {
                                            fallback: "Manual"
                                        })}
                                    </Badge>
                                ) : (
                                    <Badge variant="green">
                                        {t("verified")}
                                    </Badge>
                                )
                            ) : (
                                <Badge variant="yellow">
                                    {t("pending", { fallback: "Pending" })}
                                </Badge>
                            )}
                        </InfoSectionContent>
                    </InfoSection>
                    <InfoSection>
                        <InfoSectionTitle>{t("certificate", { fallback: "Certificate" })}</InfoSectionTitle>
                        <InfoSectionContent>
                            {getCertBadge()}
                        </InfoSectionContent>
                    </InfoSection>
                </InfoSections>
            </AlertDescription>
        </Alert>
    );
}
