
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPurchaseOrder, listPurchaseOrders, updatePurchaseOrderStatus, updatePurchaseOrder, deletePurchaseOrder, receivePurchaseOrderItems, getPurchaseOrder, updatePurchaseOrderPayment, addPurchaseOrderPayment } from "../../../lib/api";

export function usePurchaseOrders({ status, supplierId, ...options } = {}) {
  return useQuery({
    queryKey: ["purchase-orders", { status, supplierId }],
    queryFn: () => listPurchaseOrders({ status, supplierId }),
    staleTime: 0,
    ...options,
  });
}

export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrder(id), // Changed from api.get to getPurchaseOrder
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "create"],
    mutationFn: (payload) => createPurchaseOrder(payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    ...options,
  });
}

export function useUpdatePurchaseOrderStatus(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "update-status"],
    mutationFn: ({ id, status, notes }) => updatePurchaseOrderStatus(id, status, notes),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    ...options,
  });
}

export function useUpdatePurchaseOrder(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "update"],
    mutationFn: ({ id, payload }) => updatePurchaseOrder(id, payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    ...options,
  });
}

export function useDeletePurchaseOrder(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "delete"],
    mutationFn: (id) => deletePurchaseOrder(id),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    ...options,
  });
}

export function useReceivePurchaseOrderItems(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "receive"],
    mutationFn: ({ id, items, amountPaid }) => receivePurchaseOrderItems(id, items, amountPaid),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      await qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    ...options,
  });
}

export function useUpdatePayment(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "update-payment"],
    mutationFn: ({ id, amountPaid }) => updatePurchaseOrderPayment(id, amountPaid),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      await qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    ...options,
  });
}

export function useAddPayment(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["purchase-orders", "add-payment"],
    mutationFn: ({ id, payload }) => addPurchaseOrderPayment(id, payload),
    onSuccess: async (...args) => {
      if (typeof options.onSuccess === "function") {
        await options.onSuccess(...args);
      }
      await qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      await qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    ...options,
  });
}
