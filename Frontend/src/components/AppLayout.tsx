import { Outlet } from "react-router-dom";
import TopNavigationBar from "./TopNavigationBar";
import Sidebar from "./Sidebar";

/**
 * Persistent shell for every authenticated page (header + sidebar + content outlet).
 *
 * Used to render TopNavigationBar/Sidebar fresh inside each page component - React Router
 * then unmounted and remounted them on every navigation, which visibly "wackelte": the header
 * briefly showed "…" instead of the user's name while it re-fetched, and the sidebar's admin-only
 * item popped in a moment after re-mounting once auth state settled again. Mounted once here at
 * a stable position in the route tree (see App.tsx), header/sidebar now survive navigation
 * between pages entirely - no re-fetch, no flicker, no reflow.
 *
 * Also fixes the visible gap between header and sidebar: the old Sidebar used a hardcoded
 * `top-[72px]` sticky offset guessing the header's height, which didn't quite match. Header and
 * sidebar are now plain flex siblings in a column layout - the sidebar simply fills the
 * remaining height, no guessed offset needed.
 */
export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNavigationBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
