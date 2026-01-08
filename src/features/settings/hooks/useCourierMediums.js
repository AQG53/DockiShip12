import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    listCourierMediums,
    createCourierMedium,
    updateCourierMedium,
    deleteCourierMedium,
} from "../../../lib/api";

export function useCourierMediums({ search, status, ...options } = {}) {
    return useQuery({
        queryKey: ["courier-mediums", { search, status }],
        queryFn: () => listCourierMediums({ search, status }),
        staleTime: 0,
        ...options,
    });
}

export function useCreateCourierMedium() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => createCourierMedium(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-mediums"] }),
    });
}

export function useUpdateCourierMedium() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => updateCourierMedium(id, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-mediums"] }),
    });
}

export function useDeleteCourierMedium() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => deleteCourierMedium(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-mediums"] }),
    });
}
