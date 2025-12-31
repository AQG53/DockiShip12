import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProducts,
  deleteProduct,
  getProductMetaEnums,
  createProduct,
  getProductById,
  updateProductParent,
  updateProductVariant,
  addProductVariant,
  searchMarketplaceChannels,
  searchListingProductNames,
  createMarketplaceChannel,
  listProductMarketplaceListings,
  addProductMarketplaceListing,
  updateProductMarketplaceListing,
  deleteProductMarketplaceListing,
  upsertProductVariantMarketplaceListings,
  listCategories,
  createCategory,
} from "../../../lib/api";
import { uploadProductImages } from "../../../lib/api";


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

export function useCategories(params) {
  return useQuery({
    queryKey: ["products", "meta", "categories", params?.search || ""],
    queryFn: () => listCategories(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", "meta", "categories"] });
    },
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

/**
 * Typeahead/search over channels. Enable when you pass a query/provider.
 */
export function useSearchMarketplaceChannels(params = {}, options = {}) {
  const { q, page = 1, perPage = 200 } = params || {};
  // const name = productName || provider; // Removed dependency on product name
  const enabledDefault = true; // Always enabled (or depends on q?)

  return useQuery({
    // use primitives so the key is stable across renders
    queryKey: ["marketplaces", "channels", "search", q || null, page, perPage],
    queryFn: () => searchMarketplaceChannels({ q, page, perPage }),
    enabled: options.enabled ?? enabledDefault,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useSearchListingProductNames(params = {}, options = {}) {
  const { q } = params || {};
  const enabledDefault = true;
  return useQuery({
    queryKey: ["marketplaces", "productNames", q || null],
    queryFn: () => searchListingProductNames({ q }),
    enabled: options.enabled ?? enabledDefault,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateMarketplaceChannel() {
  return useMutation({
    mutationKey: ["marketplaces", "channels", "create"],
    mutationFn: createMarketplaceChannel,
  });
}

/**
 * List all listings for a product (optionally filter by variant).
 */
export function useProductMarketplaceListings(productId, { variantId, ...options } = {}) {
  return useQuery({
    queryKey: ["marketplaces", "listings", productId, variantId ?? null],
    queryFn: () => listProductMarketplaceListings(productId, { variantId }),
    enabled: !!productId,
    ...options,
  });
}

export function useAddProductMarketplaceListing(productId) {
  return useMutation({
    mutationKey: ["marketplaces", "listings", "add", productId],
    mutationFn: (payload) => addProductMarketplaceListing(productId, payload),
  });
}

export function useUpdateProductMarketplaceListing(productId) {
  return useMutation({
    mutationKey: ["marketplaces", "listings", "update", productId],
    mutationFn: ({ listingId, payload }) =>
      updateProductMarketplaceListing(productId, listingId, payload),
  });
}

export function useDeleteProductMarketplaceListing(productId) {
  return useMutation({
    mutationKey: ["marketplaces", "listings", "delete", productId],
    mutationFn: (listingId) => deleteProductMarketplaceListing(productId, listingId),
  });
}

/**
 * Bulk upsert variant listings for a product.
 * rows: [{ variantId, channelId, sku, units }]
 */
export function useBulkUpsertVariantMarketplaceListings(productId) {
  return useMutation({
    mutationKey: ["marketplaces", "listings", "bulk", productId],
    mutationFn: (rows) => upsertProductVariantMarketplaceListings(productId, rows),
  });
}
