import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  archiveWarehouse,
  getWarehouseStock,
} from "../../../lib/api";

export function useWarehouses({ search, status, ...options } = {}) {
  return useQuery({
    queryKey: ["warehouses", { search, status }],
    queryFn: () => listWarehouses({ search, status }),
    staleTime: 0,
    retry: false,
    keepPreviousData: false,
    ...options,
  });
}

export function useCreateWarehouse(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["warehouses", "create"],
    mutationFn: (payload) => createWarehouse(payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    ...options,
  });
}

export function useUpdateWarehouse(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["warehouses", "update"],
    mutationFn: ({ id, payload }) => updateWarehouse(id, payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    ...options,
  });
}

export function useArchiveWarehouse(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["warehouses", "archive"],
    mutationFn: (id) => archiveWarehouse(id),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    ...options,
  });
}

export function useWarehouseStock(id, options = {}) {
  return useQuery({
    queryKey: ["warehouse-stock", id],
    queryFn: () => getWarehouseStock(id),
    enabled: !!id,
    staleTime: 0,
    retry: false,
    ...options,
  });
}
