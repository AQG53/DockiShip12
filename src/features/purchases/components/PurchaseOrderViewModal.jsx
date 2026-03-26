import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Loader,
  Store,
  Warehouse,
  FileText,
  Package,
  Calculator,
  Paperclip,
  Download,
} from "lucide-react";
import ViewModal from "../../../components/ViewModal";
import ImageGallery from "../../../components/ImageGallery";

const card = "rounded-xl border border-gray-200 bg-white shadow-sm";

const statusTone = (status) => {
  const base = (status || "draft").toLowerCase();
  const map = {
    draft: "bg-gray-100 text-gray-700",
    to_purchase: "bg-blue-100 text-blue-700",
    in_transit: "bg-amber-100 text-amber-700",
    partially_received: "bg-amber-100 text-amber-700",
    received: "bg-emerald-100 text-emerald-700",
    canceled: "bg-red-100 text-red-700",
  };
  return map[base] || "bg-gray-100 text-gray-700";
};

const formatCurrency = (value, currency = "USD") => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
};

const formatUnitPrice = (value, currency = "USD") => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(3)}`;
  }
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "heic", "heif"]);
const OFFICE_EXTENSIONS = new Set(["doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx"]);
const OFFICE_MIME_PREFIXES = [
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument",
];

const getFileExtension = (value = "") => {
  const cleanValue = String(value || "").split("?")[0];
  const dotIndex = cleanValue.lastIndexOf(".");
  return dotIndex === -1 ? "" : cleanValue.slice(dotIndex + 1).toLowerCase();
};

const isImageAttachment = (attachment = {}) => {
  const mimeType = String(attachment?.mimeType || "").toLowerCase();
  if (mimeType.startsWith("image/")) return true;
  const ext = getFileExtension(attachment?.fileName || attachment?.filePath || "");
  return IMAGE_EXTENSIONS.has(ext);
};

const isPdfAttachment = (attachment = {}) => {
  const mimeType = String(attachment?.mimeType || "").toLowerCase();
  if (mimeType === "application/pdf") return true;
  const ext = getFileExtension(attachment?.fileName || attachment?.filePath || "");
  return ext === "pdf";
};

const isOfficeAttachment = (attachment = {}) => {
  const mimeType = String(attachment?.mimeType || "").toLowerCase();
  if (OFFICE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) return true;
  const ext = getFileExtension(attachment?.fileName || attachment?.filePath || "");
  return OFFICE_EXTENSIONS.has(ext);
};

const officeViewerUrlFromAttachmentUrl = (fileUrl = "") =>
  fileUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : "";
const getVariantAwareProductImages = ({ productImages = [], variantId = null } = {}) => {
  const rawImages = Array.isArray(productImages) ? productImages : [];
  if (rawImages.length === 0) return [];
  if (!variantId) return rawImages;

  const variantImages = rawImages.filter((img) => String(img?.url || "").includes(String(variantId)));
  if (variantImages.length > 0) return variantImages;

  return rawImages.filter((img) => {
    const u = String(img?.url || "");
    if (!u.includes("/uploads/")) return true;
    const parts = u.split("/uploads/")[1]?.split("/") || [];
    return parts.length === 2;
  });
};

export default function PurchaseOrderViewModal({ po, loading, onClose, currency }) {
  const open = Boolean(po);
  const poStatus = String(po?.status || "").toLowerCase();
  const showLandedCost = poStatus === "received" || poStatus === "partially_received";

  const orderedItems = useMemo(() => {
    const items = Array.isArray(po?.items) ? po.items : [];
    const grouped = new Map();
    const ungrouped = [];

    for (const item of items) {
      const productKey = item?.productId || item?.product?.id;
      if (!productKey) {
        ungrouped.push(item);
        continue;
      }
      const key = String(productKey);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }

    return [...Array.from(grouped.values()).flat(), ...ungrouped];
  }, [po?.items]);

  const attachments = Array.isArray(po?.attachments) ? po.attachments : [];
  const statusLabel = (po?.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const itemTotals = useMemo(() => {
    return orderedItems.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0;
      const receivedQty = Number(item.receivedQty) || 0;
      const remainingQty = Math.max(0, qty - receivedQty);
      const price = Number(item.unitPrice) || 0;
      const landedCost = item.landedCostPerUnit != null ? Number(item.landedCostPerUnit) : null;
      const taxRate = Number(item.taxRate) || 0;
      const subtotal = qty * price;
      const tax = subtotal * (taxRate / 100);
      const lineTotal = subtotal + tax;

      acc.ordered += qty;
      acc.received += receivedQty;
      acc.remaining += remainingQty;
      acc.lineTotal += lineTotal;

      if (landedCost != null && Number.isFinite(landedCost)) {
        acc.landedCost += landedCost * qty;
        acc.landedCostQty += qty;
      }

      return acc;
    }, {
      ordered: 0,
      received: 0,
      remaining: 0,
      lineTotal: 0,
      landedCost: 0,
      landedCostQty: 0,
    });
  }, [orderedItems]);

  const [imageAttachmentPreview, setImageAttachmentPreview] = useState(null);
  const [documentAttachmentPreview, setDocumentAttachmentPreview] = useState(null);
  const printableContentRef = useRef(null);

  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#9ca3af"><circle cx="26" cy="30" r="8"/><path d="M8 60l15-15 10 10 12-12 27 27H8z"/></g></svg>'
    );

  const absImg = (url) =>
    !url
      ? IMG_PLACEHOLDER
      : /^https?:\/\//i.test(url)
        ? url
        : `${API_BASE}${url}`;

  const attachmentUrl = (filePath) =>
    !filePath
      ? ""
      : /^https?:\/\//i.test(filePath)
        ? filePath
        : `${API_BASE}${filePath}`;

  const handleAttachmentClick = (attachment) => {
    const url = attachmentUrl(attachment?.filePath);
    if (!url) return;

    if (isImageAttachment(attachment)) {
      const imageAttachments = attachments.filter(isImageAttachment);
      const imagePreviewItems = (imageAttachments.length > 0 ? imageAttachments : [attachment])
        .map((att) => ({
          id: att.id,
          url: attachmentUrl(att.filePath),
          alt: att.fileName || "Attachment image",
          productName: att.fileName || "Attachment image",
        }))
        .filter((img) => Boolean(img.url));

      if (imagePreviewItems.length === 0) return;
      setDocumentAttachmentPreview(null);
      setImageAttachmentPreview({
        poLabel: po?.poNumber || po?.id,
        images: imagePreviewItems,
      });
      return;
    }

    if (isPdfAttachment(attachment)) {
      setImageAttachmentPreview(null);
      setDocumentAttachmentPreview({
        kind: "pdf",
        poLabel: po?.poNumber || po?.id,
        fileName: attachment?.fileName || "attachment.pdf",
        url,
      });
      return;
    }

    if (isOfficeAttachment(attachment)) {
      setImageAttachmentPreview(null);
      setDocumentAttachmentPreview({
        kind: "office",
        poLabel: po?.poNumber || po?.id,
        fileName: attachment?.fileName || "attachment",
        url,
        viewerUrl: officeViewerUrlFromAttachmentUrl(url),
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadPdf = () => {
    if (!printableContentRef.current) return;
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");
    const contentHtml = printableContentRef.current.innerHTML;
    const poLabel = po?.poNumber || "purchase-order";
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${poLabel}.pdf</title>
        ${styleTags}
        <style>
          @page { size: auto; margin: 10mm 10mm 12mm 10mm; }
          html, body { margin: 0; padding: 0; background: #ffffff; color: #111827; }
          body { padding: 6mm 6mm 8mm 6mm; }
          .print-sheet { max-width: 1200px; margin: 0 auto; }
          .print-sheet > :first-child { margin-top: 0 !important; }
          .print-sheet > :last-child { margin-bottom: 0 !important; }
          .print-sheet > * + * { margin-top: 12px !important; }
          .print-sheet * { box-sizing: border-box; }
          table { width: 100%; border-collapse: collapse; }
          thead { display: table-header-group; }
          tr, td, th, img { break-inside: avoid; page-break-inside: avoid; }
          .rounded-xl { break-inside: auto; page-break-inside: auto; }
        </style>
      </head>
      <body>
        <div class="print-sheet">${contentHtml}</div>
      </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      const targetWindow = iframe.contentWindow;
      if (!targetWindow) {
        document.body.removeChild(iframe);
        return;
      }
      targetWindow.focus();
      targetWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 400);
    };

    if (doc.readyState === "complete") {
      setTimeout(triggerPrint, 150);
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 150);
    }
  };

  return (
    <>
      <ViewModal
        open={open}
        onClose={onClose}
        title={`Purchase Order ${po?.poNumber || ""}`}
        subtitle={new Date(po?.createdAt || po?.created_at || Date.now()).toLocaleString()}
        widthClass="max-w-5xl"
        headerRight={
          <div className={`text-[12px] px-3 py-1 rounded-full ${statusTone(po?.status)}`}>
            {statusLabel || "—"}
          </div>
        }
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              onClick={handleDownloadPdf}
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              className="h-9 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div ref={printableContentRef} className="space-y-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className={card}>
                <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <Store className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Supplier Details</h3>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Company</p>
                    <p className="text-sm font-medium text-gray-900">{po?.supplier?.companyName || "—"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{po?.supplier?.email || "—"}</p>
                  </div>
                </div>
              </div>

              <div className={card}>
                <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <Warehouse className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Warehouse Details</h3>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Warehouse Name</p>
                    <p className="text-sm font-medium text-gray-900">{po?.warehouse?.name || po?.warehouse?.code || "—"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-900">
                      {[
                        po?.warehouse?.address1,
                        po?.warehouse?.address2,
                        po?.warehouse?.city,
                        po?.warehouse?.state,
                        po?.warehouse?.zipCode,
                        po?.warehouse?.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                <FileText className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Order Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Expected Delivery</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">
                      {po?.expectedDeliveryDate
                        ? new Date(po.expectedDeliveryDate).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Notes</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {po?.notes || <span className="italic text-gray-400">No notes available.</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                <Package className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="w-16 px-3 py-2 text-center">Image</th>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-center">Ordered</th>
                      <th className="px-3 py-2 text-center">Received</th>
                      <th className="px-3 py-2 text-center">Remaining</th>
                      <th className="px-3 py-2 text-center">Unit price</th>
                      {showLandedCost && <th className="px-3 py-2 text-center">Landed cost</th>}
                      <th className="px-3 py-2 text-center">Tax %</th>
                      <th className="px-3 py-2 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderedItems.map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const price = Number(item.unitPrice) || 0;
                      const landedCost = item.landedCostPerUnit != null ? Number(item.landedCostPerUnit) : null;
                      const taxRate = Number(item.taxRate) || 0;
                      const subtotal = qty * price;
                      const tax = subtotal * (taxRate / 100);
                      const lineTotal = subtotal + tax;
                      const variant = item.productVar || item.productVariant || {};
                      const product = item.product || {};
                      const variantImages = getVariantAwareProductImages({
                        productImages: product.images || [],
                        variantId: item.productVariantId || variant?.id || null,
                      });

                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-3 text-center align-middle">
                            <ImageGallery
                              images={variantImages}
                              absImg={absImg}
                              placeholder={IMG_PLACEHOLDER}
                              className="mx-auto w-12"
                              thumbnailClassName="h-12 w-12"
                              compact={true}
                            />
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <div className="font-semibold text-gray-900">{product.name || "Product"}</div>
                            <div className="text-xs text-gray-500">SKU: {variant.sku || product.sku || "—"}</div>
                            {(variant.sizeText || variant.colorText) && (
                              <div className="text-xs text-gray-500">
                                {variant.sizeText && `Size: ${variant.sizeText}`}
                                {variant.sizeText && variant.colorText && " • "}
                                {variant.colorText && `Color: ${variant.colorText}`}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center align-middle text-gray-600">{qty}</td>
                          <td className="px-3 py-3 text-center align-middle font-medium text-emerald-600">{item.receivedQty || 0}</td>
                          <td className="px-3 py-3 text-center align-middle font-medium text-amber-600">{Math.max(0, qty - (item.receivedQty || 0))}</td>
                          <td className="px-3 py-3 text-center align-middle text-gray-600">{formatUnitPrice(price, currency)}</td>
                          {showLandedCost && (
                            <td className="px-3 py-3 text-center align-middle text-gray-600">
                              {landedCost != null && Number.isFinite(landedCost) ? formatCurrency(landedCost, currency) : "—"}
                            </td>
                          )}
                          <td className="px-3 py-3 text-center align-middle">{taxRate}</td>
                          <td className="px-3 py-3 text-right align-middle font-semibold text-gray-900">
                            {formatCurrency(lineTotal, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {orderedItems.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50 text-[13px] font-semibold text-gray-800">
                        <td className="px-3 py-3 text-center align-middle">Total</td>
                        <td className="px-3 py-3 align-middle text-left">Summary</td>
                        <td className="px-3 py-3 text-center align-middle">{itemTotals.ordered}</td>
                        <td className="px-3 py-3 text-center align-middle">{itemTotals.received}</td>
                        <td className="px-3 py-3 text-center align-middle">{itemTotals.remaining}</td>
                        <td className="px-3 py-3 text-center align-middle">—</td>
                        {showLandedCost && (
                          <td className="px-3 py-3 text-center align-middle">
                            {itemTotals.landedCostQty > 0
                              ? formatCurrency(itemTotals.landedCost / itemTotals.landedCostQty, currency)
                              : "—"}
                          </td>
                        )}
                        <td className="px-3 py-3 text-center align-middle">—</td>
                        <td className="px-3 py-3 text-right align-middle">{formatCurrency(itemTotals.lineTotal, currency)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {orderedItems.length === 0 && <div className="p-4 text-center text-sm text-gray-500">No items</div>}
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                </div>
                {(() => {
                  const total = Number(po?.totalAmount) || 0;
                  const paid = Number(po?.amountPaid) || 0;
                  let label = "Unpaid";
                  let color = "bg-red-50 text-red-600";

                  if (paid >= total && total > 0) {
                    label = "Fully Paid";
                    color = "bg-emerald-100 text-emerald-700";
                  } else if (paid > 0) {
                    label = "Partially Paid";
                    color = "bg-amber-100 text-amber-700";
                  }

                  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
                })()}
              </div>
              <div className="space-y-2 px-4 py-4 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(po?.subtotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Product tax</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(po?.productTax, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping cost</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(po?.shippingCost, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping tax</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(po?.shippingTax, currency)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <span>Total amount</span>
                  <span>{formatCurrency(po?.totalAmount, currency)}</span>
                </div>

                <div className="mt-3 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span>Amount Paid</span>
                    <span className="font-medium text-gray-900">{formatCurrency(po?.amountPaid || 0, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                <Paperclip className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
              </div>
              <div className="space-y-2 px-4 py-4">
                {attachments.length === 0 ? (
                  <p className="text-sm italic text-gray-500">No attachments</p>
                ) : (
                  attachments.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => handleAttachmentClick(att)}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="truncate text-left text-blue-700">{att.fileName || "Attachment"}</span>
                      {att.fileSize != null && (
                        <span className="ml-3 flex-shrink-0 text-xs text-gray-400">
                          {Math.max(1, Math.round(Number(att.fileSize) / 1024))}KB
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </ViewModal>

      <ViewModal
        open={Boolean(imageAttachmentPreview)}
        onClose={() => setImageAttachmentPreview(null)}
        title={`Attachment Preview${imageAttachmentPreview?.poLabel ? ` • ${imageAttachmentPreview.poLabel}` : ""}`}
        subtitle={
          imageAttachmentPreview?.images?.length > 1
            ? `${imageAttachmentPreview.images.length} image files`
            : imageAttachmentPreview?.images?.[0]?.productName || "Image attachment"
        }
        widthClass="max-w-5xl"
        heightClass="h-[85vh]"
        footer={
          <button
            className="h-9 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            onClick={() => setImageAttachmentPreview(null)}
          >
            Close
          </button>
        }
      >
        {imageAttachmentPreview?.images?.length ? (
          <div className="flex justify-center">
            <ImageGallery
              images={imageAttachmentPreview.images}
              absImg={(url) => url || IMG_PLACEHOLDER}
              placeholder={IMG_PLACEHOLDER}
              className="w-full max-w-4xl"
              thumbnailClassName="h-[62vh] w-full bg-white"
              showName
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No image attachment found.</p>
        )}
      </ViewModal>

      <ViewModal
        open={Boolean(documentAttachmentPreview)}
        onClose={() => setDocumentAttachmentPreview(null)}
        title={`${documentAttachmentPreview?.kind === "office" ? "Document Preview" : "PDF Preview"}${documentAttachmentPreview?.poLabel ? ` • ${documentAttachmentPreview.poLabel}` : ""}`}
        subtitle={documentAttachmentPreview?.fileName || "Attachment"}
        widthClass="max-w-5xl"
        heightClass="h-[85vh]"
        footer={
          <button
            className="h-9 rounded-lg px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            onClick={() => setDocumentAttachmentPreview(null)}
          >
            Close
          </button>
        }
      >
        {documentAttachmentPreview?.kind === "office" ? (
          documentAttachmentPreview?.viewerUrl ? (
            <iframe
              src={documentAttachmentPreview.viewerUrl}
              title={documentAttachmentPreview.fileName || "Office attachment"}
              className="h-[66vh] w-full rounded-lg border border-gray-200 bg-white"
            />
          ) : (
            <p className="text-sm text-gray-500">No Office document preview available.</p>
          )
        ) : documentAttachmentPreview?.url ? (
          <iframe
            src={documentAttachmentPreview.url}
            title={documentAttachmentPreview.fileName || "PDF attachment"}
            className="h-[66vh] w-full rounded-lg border border-gray-200 bg-white"
          />
        ) : (
          <p className="text-sm text-gray-500">No document attachment available.</p>
        )}
      </ViewModal>
    </>
  );
}
