import type { ReactNode } from "react";

import AppShell from "@/app/_components/AppShell";

/**
 * Every page inside the app (home, a show, the trail, the friends) shares
 * one frame: the sidebar, the top bar and the phone's tab bar. As a layout it
 * stays mounted from page to page, so only the content swaps, and the loader
 * shows in the content alone.
 */
export default function InAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
