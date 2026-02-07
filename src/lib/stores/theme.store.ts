// import { writable } from 'svelte/store';

// const storedTheme = localStorage.getItem('theme') || 'dark'; // default dark

// export const theme = writable<string>(storedTheme);

// // Automatically update localStorage whenever theme changes
// theme.subscribe((val) => {
//   localStorage.setItem('theme', val);

//   // Update <html data-theme> for daisyUI
//   document.documentElement.setAttribute('data-theme', val);
// });

// src/lib/stores/theme.store.ts

import { writable } from 'svelte/store';

const storedTheme =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('theme') ?? 'dark'
    : 'dark';

export const theme = writable<string>(storedTheme);

// 🔥 single global side-effect
theme.subscribe((val) => {
  if (typeof document === 'undefined') return;

  localStorage.setItem('theme', val);
  document.documentElement.setAttribute('data-theme', val);
});
