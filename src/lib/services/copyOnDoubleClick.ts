// src/lib/services/copyOnDoubleClick.ts
export function copyOnDoubleClick(node: HTMLElement, text?: string) {
  let lastTap = 0;

  async function copyText(toCopy: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(toCopy);
      } else {
        // fallback: temporary input
        const input = document.createElement('input');
        input.value = toCopy;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      // optional: visual feedback
      node.classList.add('copied');
      setTimeout(() => node.classList.remove('copied'), 500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  function handleClick(event: MouseEvent | TouchEvent) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      // double-tap / double-click detected
      copyText(text ?? node.textContent ?? '');
    }
    lastTap = currentTime;
  }

  node.addEventListener('click', handleClick);
  node.addEventListener('touchend', handleClick);

  return {
    destroy() {
      node.removeEventListener('click', handleClick);
      node.removeEventListener('touchend', handleClick);
    }
  };
}
