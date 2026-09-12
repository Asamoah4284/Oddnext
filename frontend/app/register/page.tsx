"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center text-mute">
      Taking you to the boards…
    </main>
  );
}
