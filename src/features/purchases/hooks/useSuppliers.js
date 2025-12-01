import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSuppliers, createSupplier, updateSupplier, archiveSupplier, listSupplierProducts, unlinkSupplierProduct } from "../../../lib/api";
import { getTenantId } from "../../../lib/axios";

export function useSuppliers(options = {}) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ["suppliers", tenantId],
    enabled: !!tenantId,
    queryFn: () => listSuppliers(),
    keepPreviousData: false,
    staleTime: 0,
    retry: false,
    ...options,
  });
}

export function useCreateSupplier(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["suppliers", "create"],
    mutationFn: (payload) => createSupplier(payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    ...options,
  });
}

export function useUpdateSupplier(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["suppliers", "update"],
    mutationFn: ({ id, payload }) => updateSupplier(id, payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    ...options,
  });
}

export function useArchiveSupplier(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["suppliers", "archive"],
    mutationFn: (id) => archiveSupplier(id),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    ...options,
  });
}


export function useSupplierProducts(supplierId, options = {}) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ["supplier-products", tenantId, supplierId],
    enabled: !!tenantId && !!supplierId,
    queryFn: () => listSupplierProducts(supplierId),
    staleTime: 0,
    retry: false,
    ...options,
  });
}

export function useUnlinkSupplierProduct(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supplier-products", "unlink"],
    mutationFn: ({ supplierId, productId }) => unlinkSupplierProduct(supplierId, productId),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["supplier-products"] });
      if (typeof options.onSuccess === "function") await options.onSuccess(_data, vars);
    },
    ...options,
  });
}
