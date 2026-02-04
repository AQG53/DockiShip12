import { useMutation } from "@tanstack/react-query";
import { listInventory } from "../../../lib/api";

export function useInventory() {
    const mutation = useMutation({
        mutationKey: ["inventory"],
        mutationFn: async (params = {}) => {
            const { rows, meta } = await listInventory(params);
            return { rows, meta };
        },
    });

    return mutation;
}
