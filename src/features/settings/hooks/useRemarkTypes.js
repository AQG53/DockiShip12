import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    listRemarkTypes,
    createRemarkType,
    updateRemarkType,
    deleteRemarkType,
} from "../../../lib/api";

export function useRemarkTypes({ search, status, ...options } = {}) {
    return useQuery({
        queryKey: ["remark-types", { search, status }],
        queryFn: () => listRemarkTypes({ search, status }),
        staleTime: 0,
        ...options,
    });
}

export function useCreateRemarkType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => createRemarkType(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["remark-types"] }),
    });
}

export function useUpdateRemarkType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => updateRemarkType(id, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["remark-types"] }),
    });
}

export function useDeleteRemarkType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => deleteRemarkType(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["remark-types"] }),
    });
}
