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
    rowKey = (row) => row.id,
    emptyMessage,
    toolbar,
}) {
    const gridClass = gridCols || `grid-cols-${columns.length}`;

    return (
        <div className="rounded-xl border border-gray-200 bg-white">
            {/* Toolbar */}
            {toolbar && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
                    {toolbar}
                </div>
            )}

            {/* Scrollable Table Container */}
            <div className="overflow-x-auto">
                {/* Header row */}
                <div
                    className={`grid ${gridClass} bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-700 min-w-max`}
                >
                    {columns.map((col) => (
                        <div key={col.key} className={col.headerClassName || col.className || ""}>
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
                                className={`grid ${gridClass} px-4 py-3 text-[13px] text-gray-800 items-center hover:bg-gray-50/50 transition-colors min-w-max`}
                            >
                                {columns.map((col) => (
                                    <div key={col.key} className={col.className || ""}>
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
