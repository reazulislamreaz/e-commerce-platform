/**
 * Imperative "add to cart" micro-interaction. A lightweight product thumbnail
 * flies along a GPU-accelerated arc (transform + opacity only) from the source
 * element toward the floating cart, then removes itself. No React re-renders
 * happen per frame, keeping the animation at ~60fps.
 */

const THUMB_WIDTH = 84;
const THUMB_HEIGHT = 104;
const DURATION_MS = 750;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface FlyToCartOptions {
  originRect: DOMRect;
  targetRect: DOMRect;
  imageSrc: string;
  container: HTMLElement;
  onFinish?: () => void;
}

export function runFlyToCart({
  originRect,
  targetRect,
  imageSrc,
  container,
  onFinish,
}: FlyToCartOptions): Animation | null {
  if (typeof document === 'undefined') return null;

  const startX = originRect.left + originRect.width / 2 - THUMB_WIDTH / 2;
  const startY = originRect.top + originRect.height / 2 - THUMB_HEIGHT / 2;
  const endX = targetRect.left + targetRect.width / 2 - THUMB_WIDTH / 2;
  const endY = targetRect.top + targetRect.height / 2 - THUMB_HEIGHT / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  const node = document.createElement('div');
  node.setAttribute('aria-hidden', 'true');
  node.style.cssText = [
    'position:fixed',
    `left:${startX}px`,
    `top:${startY}px`,
    `width:${THUMB_WIDTH}px`,
    `height:${THUMB_HEIGHT}px`,
    'border-radius:6px',
    'overflow:hidden',
    'pointer-events:none',
    'box-shadow:0 14px 34px rgba(0,0,0,.28)',
    'background-color:#e4e3e1',
    `background-image:url("${imageSrc.replace(/"/g, '%22')}")`,
    'background-size:cover',
    'background-position:center',
    'will-change:transform,opacity',
  ].join(';');

  container.appendChild(node);

  const keyframes: Keyframe[] = [
    { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, offset: 0 },
    {
      transform: `translate3d(${dx * 0.5}px, ${dy * 0.5 - 70}px, 0) scale(0.62)`,
      opacity: 0.95,
      offset: 0.55,
    },
    { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.12)`, opacity: 0.2, offset: 1 },
  ];

  const animation = node.animate(keyframes, {
    duration: DURATION_MS,
    easing: 'cubic-bezier(.66,.02,.3,1)',
    fill: 'forwards',
  });

  const cleanup = () => {
    node.remove();
    onFinish?.();
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;

  return animation;
}
