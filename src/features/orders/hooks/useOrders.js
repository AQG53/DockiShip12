import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    listOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    listColors,
    createColor,
    listSizes,
    createSizeOrder,
    listCategories,
    createCategoryOrder,
    getOrderCounts,
    listProductsForOrderSelection,
    bulkUpdateOrder,
    uploadOrderLabel,
    deleteOrderLabel,
} from "../../../lib/api";

// --- Products for Selection (Flattened) ---

export function useProductsForSelection(search = "", channelId = null) {
    return useQuery({
        queryKey: ["products", "forSelection", search, channelId],
        queryFn: () => listProductsForOrderSelection({ search, channelId, perPage: 20 }),
        staleTime: 0, // Always fetch fresh
        enabled: true // Always enabled, API handles null channelId
    });
}

export function useOrderCounts(options = {}) {
    return useQuery({
        queryKey: ["orders", "counts"],
        queryFn: getOrderCounts,
        staleTime: 5 * 60 * 1000,
        ...options
    });
}

// --- Orders ---

export function useOrders(params = {}, options = {}) {
    // params: search, status, startDate, endDate, mediumId, courierId, page, perPage
    const queryKey = ["orders", params];
    return useQuery({
        queryKey,
        queryFn: () => listOrders(params),
        staleTime: 0,
        ...options,
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => createOrder(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => updateOrder(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

export function useDeleteOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => deleteOrder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

export function useBulkUpdateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ids, status }) => bulkUpdateOrder(ids, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

export function useUploadOrderLabel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ orderId, formData }) => uploadOrderLabel(orderId, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

export function useDeleteOrderLabel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (orderId) => deleteOrderLabel(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}

// --- Colors ---

export function useOrderColors(tenantId) {
    // listColors from api.js calls /orders/meta/colors, which doesn't need params locally (tenantId extracted from token)
    return useQuery({
        queryKey: ["orders", "meta", "colors"],
        queryFn: () => listColors(),
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateOrderColor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, code }) => createColor(name, code),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders", "meta", "colors"] });
        },
    });
}

// --- Sizes (reuse generic sizes mostly, but wrapped here) ---

export function useOrderSizes(params) {
    return useQuery({
        queryKey: ["products", "meta", "sizes", params?.search || ""], // reusing products key to share cache?
        queryFn: () => listSizes(params),
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateOrderSize() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ code, name }) => createSizeOrder(code, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products", "meta", "sizes"] }); // invalidate product sizes too
        },
    });
}

// --- Categories ---

export function useOrderCategories(params) {
    return useQuery({
        queryKey: ["products", "meta", "categories", params?.search || ""],
        queryFn: () => listCategories(params),
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateOrderCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name) => createCategoryOrder(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products", "meta", "categories"] });
        },
    });
}
