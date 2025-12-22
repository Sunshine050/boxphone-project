import Link from "next/link"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen w-full flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-900 text-white p-4">
                <div className="mb-8 text-2xl font-bold">RemoteCtl</div>
                <nav className="space-y-2">
                    <Link href="/user/my-devices" className="block p-2 hover:bg-slate-800 rounded">
                        My Devices
                    </Link>
                    <Link href="/admin/devices" className="block p-2 hover:bg-slate-800 rounded">
                        Manage Devices (Admin)
                    </Link>
                    <Link href="/admin/users" className="block p-2 hover:bg-slate-800 rounded">
                        Manage Users (Admin)
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-100 p-8">
                {children}
            </main>
        </div>
    )
}
