import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-16">
      <h1 className="text-3xl font-semibold">Mini LMS</h1>
      <Button asChild className="w-fit">
        <Link href="/protected">Dashboard</Link>
      </Button>
    </main>
  );
}
