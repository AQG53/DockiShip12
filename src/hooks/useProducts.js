import { useMutation, useQuery } from "@tanstack/react-query";
import {
  listProducts,
  deleteProduct,
  getProductMetaEnums,
  createProduct,
  getProductById,
  updateProductParent,
  updateProductVariant,
  addProductVariant
} from "../lib/api";
import { uploadProductImages } from "../lib/api";


export function useProducts() {
  const mutation = useMutation({
    mutationKey: ["products"],
    mutationFn: async (params = {}) => {
      const { rows, meta } = await listProducts(params);
      return { rows, meta };
    },
  });

  return mutation;
}

export function useDeleteProduct() {
  return useMutation({
    mutationKey: ["deleteProduct"],
    mutationFn: async (id) => {
      if (!id) throw new Error("Missing product ID");
      const ok = await deleteProduct(id);
      return ok;
    },
  });
}

export function useProductMetaEnums(options = {}) {
  return useQuery({
    queryKey: ["products", "meta", "enums"],
    queryFn: getProductMetaEnums,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationKey: ["products", "create"],
    mutationFn: async (payload) => {
      if (!payload) throw new Error("Missing payload");
      const res = await createProduct(payload);
      return res;
    },
  });
}

export function useGetProduct(productId, options = {}) {
  return useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
    ...options,
  });
}

export function useUpdateProductParent() {
  return useMutation({
    mutationKey: ["products", "update", "parent"],
    mutationFn: ({ productId, payload }) => updateProductParent(productId, payload),
  });
}

export function useUpdateVariant() {
  return useMutation({
    mutationKey: ["products", "update", "variant"],
    mutationFn: ({ productId, variantId, payload }) =>
      updateProductVariant(productId, variantId, payload),
  });
}

export function useAddVariant() {
  return useMutation({
    mutationKey: ["products", "variants", "add"],
    mutationFn: ({ productId, payload }) => addProductVariant(productId, payload),
  });
}

export function useUploadProductImages() {
  return useMutation({
    mutationKey: ["products", "images", "upload"],
    mutationFn: ({ productId, files, variantId }) => uploadProductImages(productId, files, { variantId }),
  });
}
