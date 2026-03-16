import type { ReactNode } from "react";
import { AdminNavigation } from "@/components/admin/admin-navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-6 animate-fade-in">
            <AdminNavigation />
            <div>{children}</div>
        </div>
    );
}
