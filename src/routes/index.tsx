import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ModeSelect, type AppMode } from "@/components/mode-select";
import { OrbitalDefense } from "@/components/defense/orbital-defense";
import { Hud } from "@/components/sim/hud";
import { OrbitCanvas, type SimApi } from "@/components/sim/orbit-canvas";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mode, setMode] = useState<AppMode | null>(null);
  const apiRef = useRef<SimApi | null>(null);

  if (mode === null) return <ModeSelect onSelect={setMode} />;
  if (mode === "defense") return <OrbitalDefense onExit={() => setMode(null)} />;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <OrbitCanvas apiRef={apiRef} />
      <Hud apiRef={apiRef} onExit={() => setMode(null)} />
    </main>
  );
}
