import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Register for free daily football tips and optional VIP access.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
