import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Check your Oddnext VIP subscription and unlock daily specials.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
