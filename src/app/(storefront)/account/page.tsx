import type { Metadata } from "next";

import { AccountPage } from "@/components/account/account-page";

export const metadata: Metadata = {
  title: "My account",
  description: "Manage your profile, saved addresses and password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AccountPage />;
}
