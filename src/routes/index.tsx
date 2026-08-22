import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Hud } from "@/components/sim/hud";
import { OrbitCanvas, type SimApi } from "@/components/sim/orbit-canvas";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const apiRef = useRef<SimApi | null>(null);
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <OrbitCanvas apiRef={apiRef} />
      <Hud apiRef={apiRef} />
    </main>
  );
}
