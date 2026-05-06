"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    if (light) {
      html.classList.remove("light");
      localStorage.setItem("theme", "dark");
      setLight(false);
    } else {
      html.classList.add("light");
      localStorage.setItem("theme", "light");
      setLight(true);
    }
  };

  return (
    <button
      onClick={toggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border transition-colors"
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
