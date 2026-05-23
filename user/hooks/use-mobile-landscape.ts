import * as React from "react";

/**
 * Phone held sideways: short viewport height, not tablet/desktop.
 * - iPhone landscape height ≈ 390–430px → matches
 * - iPad landscape height ≥ 768px → excluded
 */
const MOBILE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 520px) and (pointer: coarse)";

export function useMobileLandscape(): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
    const update = () => setMatches(mql.matches);
    mql.addEventListener("change", update);
    update();
    return () => mql.removeEventListener("change", update);
  }, []);

  return matches;
}
