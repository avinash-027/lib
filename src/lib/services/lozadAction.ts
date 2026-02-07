
export function lozadAction1(node: HTMLImageElement) {
  const observer = new IntersectionObserver(([entry], obs) => {
    if (entry.isIntersecting) {
      const src = node.dataset.src;
      if (src) node.src = src;
      node.classList.add('lozad-loaded');
      obs.unobserve(node); // works correctly
    }
  });

  observer.observe(node);

  return {
    destroy() {
      observer.unobserve(node);
    }
  };
}
// Every time the action runs, you create a new Lozad observer
// Each observer scans the entire DOM. Multiple observers watching overlapping elements = wasted work
export function lozadAction2(node: HTMLImageElement) {
  node.classList.add('lozad-action'); // temporary class
  const observer = lozad('.lozad-action', {
    loaded: (el) => el.classList.add('lozad-loaded')
  });

  observer.observe();

  return {
    destroy() {
      node.classList.remove('lozad-action'); // stops matching
      // optionally call observer.observe() again if dynamically adding nodes
    }
  };
}




