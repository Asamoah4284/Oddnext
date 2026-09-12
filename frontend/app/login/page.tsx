"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center text-mute">
      Opening admin desk…
    </main>
  );
}
