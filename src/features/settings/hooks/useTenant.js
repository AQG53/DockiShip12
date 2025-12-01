import { useEffect, useState } from "react";
import { getTenantId } from "../../../lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTenant } from "../../../lib/api";
import toast from "react-hot-toast";

export function useTenant() {
    const [tenantId, setTenantId] = useState(() => getTenantId());

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "ds_tenant_id") setTenantId(getTenantId());
        };
        const onCustom = () => setTenantId(getTenantId());

        window.addEventListener("storage", onStorage);
        window.addEventListener("tenant-changed", onCustom);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("tenant-changed", onCustom);
        };
    }, []);

    return tenantId;
}

export default function useUpdateTenant() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: updateTenant,
        onSuccess: async () => {
            toast.success("Company updated successfully!");
            await qc.invalidateQueries({ queryKey: ["authCheck"] });
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update company";
            toast.error(msg);
        },
    });
}
