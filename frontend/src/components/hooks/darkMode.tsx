import { useEffect } from "react";

type Theme = "light" | "dark";

function useDarkMode({ theme }: { theme: Theme }) {
  const applyTheme = (theme: Theme) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  };

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);
}

export default useDarkMode;
