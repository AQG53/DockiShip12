import { NoData } from "../NoData";
import { Search } from "lucide-react";

/**
 * Reusable DataTable component matching the ProductList UI style.
 * 
 * @param {Object} props
 * @param {Array} props.columns - Array of column definitions: { key, label, className?, headerClassName?, render? }
 * @param {Array} props.rows - Array of data rows
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.gridCols - Tailwind grid-cols class (e.g., "grid-cols-[1fr_100px]")
 * @param {Function} props.rowKey - Function to get unique key from row (default: row.id)
 * @param {string} props.emptyMessage - Message to show when no data
 * @param {ReactNode} props.toolbar - Optional toolbar content (search, filters, add button)
 */
export function DataTable({
    columns = [],
    rows = [],
    isLoading = false,
    gridCols,
    gridTemplateColumns,
    contentMinWidthClass = "min-w-max",
    rowKey = (row) => row.id,
    emptyMessage,
    toolbar,
    rowClassName = "",
}) {
    const getGridTemplateFromClass = (value) => {
        const text = String(value || "");
        const match = text.match(/(?:^|\s)(?:[\w-]+:)*grid-cols-\[([^\]]+)\]/);
        if (!match?.[1]) return null;
        return match[1].replace(/_/g, " ");
    };

    const resolvedGridTemplateColumns =
        gridTemplateColumns || getGridTemplateFromClass(gridCols) || null;

    const gridClass = gridCols || (!resolvedGridTemplateColumns ? `grid-cols-${columns.length}` : "");
    const gridStyle = resolvedGridTemplateColumns
        ? { gridTemplateColumns: resolvedGridTemplateColumns }
        : undefined;

    return (
        <div className="rounded-xl border border-gray-200 bg-white">
            {/* Toolbar */}
            {toolbar && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
                    {toolbar}
                </div>
            )}

            {/* Scrollable Table Container */}
            <div className="overflow-x-auto w-full max-w-full">
                {/* Header row */}
                <div
                    className={`grid ${gridClass} bg-gray-50 text-[12px] font-semibold text-gray-700 ${contentMinWidthClass} [&>*:first-child]:pl-4 [&>*:last-child]:pr-4`}
                    style={gridStyle}
                >
                    {columns.map((col) => (
                        <div key={col.key} className={`${col.headerClassName || col.className || ""} py-3 flex items-center min-w-0`}>
                            {col.label}
                        </div>
                    ))}
                </div>

                {/* Body */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                        Loading...
                    </div>
                ) : rows.length === 0 ? (
                    <NoData className="py-12" message={emptyMessage} />
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {rows.map((row) => (
                            <li
                                key={rowKey(row)}
                                className={`relative grid ${gridClass} text-[13px] text-gray-800 hover:bg-gray-50/50 transition-colors ${contentMinWidthClass} group [&>*:first-child]:pl-4 [&>*:last-child]:pr-4 ${typeof rowClassName === 'function' ? rowClassName(row) : rowClassName}`}
                                style={gridStyle}
                            >
                                {columns.map((col) => (
                                    <div
                                        key={col.key}
                                        className={`${col.className || ""} py-3 flex items-center min-w-0 ${col.allowOverflow ? "overflow-visible" : "overflow-hidden"}`}
                                    >
                                        {col.render ? col.render(row) : row[col.key] ?? "—"}
                                    </div>
                                ))}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

/**
 * Search input component for use with DataTable toolbar
 */
export function TableSearch({ value, onChange, placeholder = "Search" }) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="h-9 w-[220px] rounded-lg border border-gray-300 pl-8 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
        </div>
    );
}
