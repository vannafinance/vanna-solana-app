// Gives every inline SVG its own element ids.
//
// react-native-svg on the web renders gradients, clip paths and masks with the ids written in the component, so two
// copies of the same icon on one screen share ids and the browser paints both with the first one's definitions
// (on Android each SVG is its own document). Each <svg> added to the page gets its ids suffixed once, and every
// reference to them (fill="url(#id)", href="#id", ...) inside that SVG is rewritten to match.

let counter = 0;
const REFERENCE_ATTRIBUTES = ["fill", "stroke", "clip-path", "mask", "filter", "href", "xlink:href"];

function scopeSvg(svg) {
  if (svg.__vnScoped) return;
  svg.__vnScoped = true;
  svg.querySelectorAll("[id]").forEach((element) => {
    const id = element.id;
    const scoped = id + "--" + ++counter;
    element.id = scoped;
    svg.querySelectorAll("*").forEach((node) => {
      for (const attribute of REFERENCE_ATTRIBUTES) {
        const value = node.getAttribute(attribute);
        if (value && value.includes("#" + id)) {
          node.setAttribute(
            attribute,
            value
              .split("#" + id + ")")
              .join("#" + scoped + ")")
              .replace(new RegExp("#" + id + "$"), "#" + scoped),
          );
        }
      }
    });
  });
}

function scan(node) {
  if (node.nodeType !== 1) return;
  if (node.tagName && node.tagName.toLowerCase() === "svg") scopeSvg(node);
  if (node.querySelectorAll) node.querySelectorAll("svg").forEach(scopeSvg);
}

if (typeof document !== "undefined") {
  new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach(scan))).observe(
    document.documentElement,
    { childList: true, subtree: true },
  );
}
