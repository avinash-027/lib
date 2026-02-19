// src/lib/services/copyOn.ts
export function copyOn(node: HTMLElement, text?: string) {
  let pressTimer: ReturnType<typeof setTimeout>;
  const LONG_PRESS_DURATION = 600; // ms
  let isPressing = false;

  async function copyText(toCopy: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(toCopy);
      } else {
        const input = document.createElement('input');
        input.value = toCopy;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }

      // optional visual feedback
      node.classList.add('copied');
      setTimeout(() => node.classList.remove('copied'), 600);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  function startPress() {
    isPressing = true;

    pressTimer = setTimeout(() => {
      if (isPressing) {
        copyText(text ?? node.textContent ?? '');
      }
    }, LONG_PRESS_DURATION);
  }

  function cancelPress() {
    isPressing = false;
    clearTimeout(pressTimer);
  }

  // Touch
  node.addEventListener('touchstart', startPress);
  node.addEventListener('touchend', cancelPress);
  node.addEventListener('touchcancel', cancelPress);

  // Mouse
  node.addEventListener('mousedown', startPress);
  node.addEventListener('mouseup', cancelPress);
  node.addEventListener('mouseleave', cancelPress);

  return {
    destroy() {
      node.removeEventListener('touchstart', startPress);
      node.removeEventListener('touchend', cancelPress);
      node.removeEventListener('touchcancel', cancelPress);
      node.removeEventListener('mousedown', startPress);
      node.removeEventListener('mouseup', cancelPress);
      node.removeEventListener('mouseleave', cancelPress);
    }
  };
}
