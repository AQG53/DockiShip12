import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, Trash2, Save, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthCheck } from "../../auth/hooks/useAuthCheck";
import useUserPermissions from "../../../hooks/useUserPermissions";
import { deleteTenantInvoiceLogo, updateTenant, uploadTenantInvoiceLogo } from "../../../lib/api";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const PAPER_PRESETS = [
  { value: "LETTER", label: 'US Letter (8.5" x 11")' },
  { value: "LEGAL", label: 'US Legal (8.5" x 14")' },
  { value: "A4", label: 'A4 (8.27" x 11.69")' },
  { value: "A5", label: 'A5 (5.83" x 8.27")' },
  { value: "LABEL_4X6", label: 'Label 4" x 6"' },
  { value: "LABEL_4X8", label: 'Label 4" x 8"' },
];

const toAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function GeneralSettings() {
  const { data, isLoading, isError, refetch } = useAuthCheck();
  const { perms, claims } = useUserPermissions();
  const isOwner = Array.isArray(claims?.roles)
    && claims.roles.some((role) => String(role).toLowerCase() === "owner");
  const canManageGeneral = isOwner || perms?.has("settings.general.manage") || perms?.has("settings.manage");

  const [labelMode, setLabelMode] = useState("DEFAULT");
  const [labelPreset, setLabelPreset] = useState("LETTER");
  const [customWidth, setCustomWidth] = useState("4");
  const [customHeight, setCustomHeight] = useState("6");
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  const [logoPath, setLogoPath] = useState("");
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    if (!data?.tenant) return;
    const tenant = data.tenant;

    setLabelMode((tenant.labelPaperSizeMode || "DEFAULT").toUpperCase());
    setLabelPreset((tenant.labelPaperSizePreset || "LETTER").toUpperCase());
    setCustomWidth(
      tenant.labelPaperCustomWidthIn != null ? String(tenant.labelPaperCustomWidthIn) : "4",
    );
    setCustomHeight(
      tenant.labelPaperCustomHeightIn != null ? String(tenant.labelPaperCustomHeightIn) : "6",
    );
    setLogoPath(tenant.reorderInvoiceLogoPath || "");
  }, [data]);

  useEffect(() => {
    if (!pendingLogoFile) {
      setPendingLogoPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(pendingLogoFile);
    setPendingLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingLogoFile]);

  useEffect(() => {
    if (!isError) return;
    toast.error("Unable to load general settings.");
  }, [isError]);

  const activeLogoSrc = useMemo(() => {
    if (pendingLogoPreview) return pendingLogoPreview;
    return toAssetUrl(logoPath);
  }, [pendingLogoPreview, logoPath]);

  const handleSaveLabelSettings = async () => {
    const mode = String(labelMode || "DEFAULT").toUpperCase();
    if (mode === "PRESET" && !labelPreset) {
      toast.error("Please select a paper size preset.");
      return;
    }

    let width = null;
    let height = null;
    if (mode === "CUSTOM") {
      width = Number(customWidth);
      height = Number(customHeight);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        toast.error("Custom size must have valid width and height in inches.");
        return;
      }
    }

    try {
      setIsSavingLabel(true);
      const updated = await updateTenant({
        labelPaperSizeMode: mode,
        labelPaperSizePreset: mode === "PRESET" ? labelPreset : null,
        labelPaperCustomWidthIn: mode === "CUSTOM" ? width : null,
        labelPaperCustomHeightIn: mode === "CUSTOM" ? height : null,
      });

      setLabelMode((updated?.labelPaperSizeMode || mode).toUpperCase());
      setLabelPreset((updated?.labelPaperSizePreset || labelPreset || "LETTER").toUpperCase());
      if (updated?.labelPaperCustomWidthIn != null) setCustomWidth(String(updated.labelPaperCustomWidthIn));
      if (updated?.labelPaperCustomHeightIn != null) setCustomHeight(String(updated.labelPaperCustomHeightIn));

      toast.success("Label download settings updated.");
      refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update label download settings.");
    } finally {
      setIsSavingLabel(false);
    }
  };

  const handleChooseLogo = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handleLogoSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const mime = String(file.type || "").toLowerCase();
    if (!["image/png", "image/jpeg", "image/jpg"].includes(mime)) {
      toast.error("Only PNG or JPG files are supported.");
      event.target.value = "";
      return;
    }
    setPendingLogoFile(file);
  };

  const handleUploadLogo = async () => {
    if (!pendingLogoFile) {
      toast.error("Please choose an image first.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const updated = await uploadTenantInvoiceLogo(pendingLogoFile);
      setLogoPath(updated?.reorderInvoiceLogoPath || "");
      setPendingLogoFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Invoice logo updated.");
      refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload invoice logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setIsRemovingLogo(true);
      await deleteTenantInvoiceLogo();
      setLogoPath("");
      setPendingLogoFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Invoice logo removed.");
      refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove invoice logo.");
    } finally {
      setIsRemovingLogo(false);
    }
  };

  const card = "rounded-2xl border border-gray-200 bg-white shadow-sm";
  const cardHead = "px-6 py-4 border-b border-gray-200";
  const cardBody = "px-6 py-5";
  const input =
    "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 " +
    "focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-transparent";
  const primaryBtn =
    "inline-flex items-center gap-2 rounded-lg bg-[#FCD33F] px-4 py-2 text-sm font-semibold text-gray-900 " +
    "shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10 disabled:opacity-50";
  const secondaryBtn =
    "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 " +
    "hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10 disabled:opacity-50";

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading general settings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">General Settings</h1>
      </div>

      <section className={card}>
        <header className={cardHead}>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Download size={18} className="text-gray-700" />
            Label Download Settings
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose the output paper size for label downloads. Uploaded label files stay unchanged.
          </p>
        </header>

        <div className={`${cardBody} space-y-4`}>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="labelMode"
                checked={labelMode === "DEFAULT"}
                onChange={() => setLabelMode("DEFAULT")}
                disabled={!canManageGeneral}
              />
              Default (Download as-is)
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="labelMode"
                checked={labelMode === "PRESET"}
                onChange={() => setLabelMode("PRESET")}
                disabled={!canManageGeneral}
              />
              Use paper size preset
            </label>

            {labelMode === "PRESET" && (
              <div className="ml-6 max-w-sm">
                <select
                  value={labelPreset}
                  onChange={(e) => setLabelPreset(e.target.value)}
                  className={input}
                  disabled={!canManageGeneral}
                >
                  {PAPER_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="labelMode"
                checked={labelMode === "CUSTOM"}
                onChange={() => setLabelMode("CUSTOM")}
                disabled={!canManageGeneral}
              />
              Custom size (inches)
            </label>

            {labelMode === "CUSTOM" && (
              <div className="ml-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.01"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="Width (in)"
                  className={input}
                  disabled={!canManageGeneral}
                />
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.01"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  placeholder="Height (in)"
                  className={input}
                  disabled={!canManageGeneral}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleSaveLabelSettings}
              disabled={isSavingLabel || !canManageGeneral}
              className={primaryBtn}
            >
              <Save size={16} />
              {isSavingLabel ? "Saving..." : "Save Label Settings"}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <header className={cardHead}>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-gray-700" />
            Invoice Settings
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload a logo to show on reorder invoice PDFs and reorder invoice emails.
          </p>
        </header>

        <div className={`${cardBody} space-y-4`}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleLogoSelected}
            className="hidden"
          />

          <div className="rounded-xl border border-dashed border-gray-300 p-4">
            {activeLogoSrc ? (
              <img
                src={activeLogoSrc}
                alt="Invoice logo preview"
                className="h-20 max-w-[280px] object-contain"
              />
            ) : (
              <p className="text-sm text-gray-500">No logo uploaded yet.</p>
            )}
          </div>

          {pendingLogoFile ? (
            <p className="text-xs text-gray-500">Selected file: {pendingLogoFile.name}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleChooseLogo}
              className={secondaryBtn}
              disabled={isUploadingLogo || isRemovingLogo || !canManageGeneral}
            >
              <ImagePlus size={16} />
              Choose Logo
            </button>

            <button
              type="button"
              onClick={handleUploadLogo}
              className={primaryBtn}
              disabled={!pendingLogoFile || isUploadingLogo || isRemovingLogo || !canManageGeneral}
            >
              <Save size={16} />
              {isUploadingLogo ? "Uploading..." : "Upload Logo"}
            </button>

            <button
              type="button"
              onClick={handleRemoveLogo}
              className={secondaryBtn}
              disabled={(!logoPath && !pendingLogoFile) || isUploadingLogo || isRemovingLogo || !canManageGeneral}
            >
              <Trash2 size={16} />
              {isRemovingLogo ? "Removing..." : "Remove Logo"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
