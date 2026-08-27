/**
 * Scroll to a homepage section, then make one guarded correction after live
 * content above it has finished changing height. Without that correction, an
 * early click can leave the target underneath the fixed navigation even when
 * CSS scroll-margin is set correctly.
 */
export function scrollToSectionWithCorrection(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth' });

  window.setTimeout(() => {
    const current = document.getElementById(id);
    if (!current) return;

    const desiredTop = parseFloat(window.getComputedStyle(current).scrollMarginTop) || 92;
    const actualTop = current.getBoundingClientRect().top;
    if (Math.abs(actualTop - desiredTop) < 6) return;

    window.scrollTo({
      top: Math.max(0, window.scrollY + actualTop - desiredTop),
      behavior: 'smooth',
    });
  }, 1000);
}
