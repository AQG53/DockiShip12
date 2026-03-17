const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const ORDER_IMG_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>',
  );

const isImagePath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return raw.includes("/uploads/") || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(raw);
};

export const absOrderImage = (path) => {
  if (!path) return ORDER_IMG_PLACEHOLDER;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

const imageRows = (rows = []) =>
  rows.filter((img) => isImagePath(img?.url)).map((img) => img.url);

export const resolveOrderItemImage = (item = {}) => {
  const listing = item?.channelListing || {};
  const variant = listing?.productVariant || item?.productVariant || null;
  const product = listing?.product || variant?.product || item?.product || null;

  const listingImage = String(listing?.url || listing?.imageUrl || "").trim();
  if (isImagePath(listingImage)) return listingImage;

  const productImages = Array.isArray(product?.images) ? product.images : [];

  // 1) variant-specific images first
  if (variant?.id) {
    const variantEntityImages = imageRows(Array.isArray(variant?.images) ? variant.images : []);
    if (variantEntityImages.length > 0) return variantEntityImages[0];

    const variantImagesFromProduct = imageRows(
      productImages.filter((img) => {
        const u = String(img?.url || "");
        return u.includes(String(variant.id));
      }),
    );
    if (variantImagesFromProduct.length > 0) return variantImagesFromProduct[0];
  }

  // 2) parent product images
  const parentImages = imageRows(
    productImages.filter((img) => {
      const u = String(img?.url || "");
      if (!u.includes("/uploads/")) return true;
      const parts = u.split("/uploads/")[1]?.split("/") || [];
      return parts.length === 2;
    }),
  );
  if (parentImages.length > 0) return parentImages[0];

  // 3) any valid image
  const anyImage = imageRows(productImages);
  if (anyImage.length > 0) return anyImage[0];

  return null;
};

