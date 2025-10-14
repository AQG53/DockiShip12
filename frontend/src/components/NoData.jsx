import { Inbox } from "lucide-react";

export function NoData() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Inbox size={44} />
            <div className="mt-2 text-sm">No Data</div>
        </div>
    );
}