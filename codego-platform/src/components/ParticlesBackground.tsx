import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useTheme } from "../context/ThemeContext";

export default function ParticlesBackground() {
  const [init, setInit] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options = useMemo(() => ({
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    interactivity: {
      events: { onHover: { enable: true, mode: "repulse" as const } },
      modes: { repulse: { distance: 120, duration: 0.4 } },
    },
    particles: {
      color: { value: isDark ? ["#00f5ff", "#ff00cc", "#6366f1"] : ["#4f46e5", "#7c3aed", "#94a3b8"] },
      links: {
        color: isDark ? "#334488" : "#c7d2fe",
        distance: 160,
        enable: true,
        opacity: isDark ? 0.18 : 0.35,
        width: 1,
      },
      move: {
        direction: "none" as const,
        enable: true,
        outModes: { default: "bounce" as const },
        speed: 1.2,
        random: true,
      },
      number: { density: { enable: true, area: 900 }, value: 55 },
      opacity: { value: { min: 0.08, max: isDark ? 0.55 : 0.4 } },
      shape: {
        type: "char",
        options: {
          char: {
            value: ["{", "}", "<", ">", "/", "()", "[]", "=>", "0", "1", "if", "for", "const", ";"],
            font: "monospace",
            style: "",
            weight: "600",
          }
        }
      },
      size: { value: { min: 8, max: 18 } },
    },
    detectRetina: true,
  }), [isDark]);

  if (!init) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Particles id="tsparticles" options={options} />
    </div>
  );
}
