# 📚 Content Organizer App

A modern **library management app** built with **SvelteKit**, **IndexedDB**, and **DaisyUI**.
Track your **manhwa, manga, novels, and more** with rich metadata, offline support, and powerful search capabilities.

### ✨ Features

* **Floating Action Button (FAB)**:  **“Add”** button. Instantly creates a new content card from a predefined template
* **View complete metadata** including: *Title & alternative titles, Description, Badges (artists, authors), Tags (genres), Characters (with names & images), Chapters (with descriptions, tags, and characters), Rating, Timestamps (created, edited, last opened)*
* **Content Cards** Responsive grid layout. Cover images and titles at a glance. Click to open detailed view
* **Category Management**: Switch between categories using tabs below the app bar. Create and manage categories via the drawer menu

- **Add / Edit Content**: Full-featured form for managing all metadata. Markdown-supported descriptions
- **Advanced Search:** Search using prefix filters — `a:` alternative titles, `t:` tags, `b:` badges, `c:` characters.
- **Filter & Sort:** Sort content by title, created date, edited date, last opened, or rating, in ascending or descending order.
- **Selection Toolbar (Draggable)**: Multi-select entries with a movable toolbar; select individual or all entries to delete or move them between categories.
- **Theming**: Multiple themes, Dynamic theme switching
- **Import / Export**: JSON-based data portability, Manual import/export, Auto-backup support, Data stored locally (IndexedDB), Export to JSON/md
- **Offline-First**: Powered by IndexedDB 
- Lazy loading (images & content)

> A fast, offlinefirst, installable content organizer built with modern web technologies. Perfect for managing manga, manhwa, novels, and other media collections with tructured metadata and powerful search. For native app-like behavior on mobile devices `Add to Home Screen`.

### 🛠 Tech Stack

* **Core:** SvelteKit, Svelte (Reactive UI), TypeScript (Type safety)
* **Styling:** Tailwind CSS (Utility-first CSS), DaisyUI (Prebuilt UI components)
* **Data & Storage:** IndexedDB (Local database), Dexie (IndexedDB wrapper)
* **Utilities & Tooling:** Marked (Markdown rendering), Lozad (Lazy loading), gh-pages (GitHub Pages deployment), @sveltejs/adapter-static (Static hosting adapter)

<details> <summary>Note</summary>
<p>

There are still errors and warnings: Check Via `npm run check` & `npm run build`

</p>
</details>

**Development Scripts**

| Command           | Description            |
| ----------------- | ---------------------- |
| `npm run dev`     | Start dev server       |
| `npm run build`   | Production build       |
| `npm run preview` | Preview build          |
| `npm run check`   | Type check + lint      |
| `npm run lint`    | Lint code              |
| `npm run format`  | Format with Prettier   |
| `npm run deploy`  | Deploy to GitHub Pages |

<details> <summary>JSON Structure</summary>
<div>

```json
// Example
[
  {
    "id": 2,
    "title": "Solo Leveling",
    "alternativeTitles": [ "Only I Level Up", "Na Honja Level Up" ],
    "coverImageUrl": "https://example.com/covers/solo-leveling.jpg",
    "description": "In a world where gates connect Earth to deadly dungeons, the weakest hunter awakens a mysterious system that allows him to level up alone.",
    "badges": ["Manhwa", "Action", "Fantasy", "Completed"],
    "tags": [ "gates", "hunters", "dungeons", "system", "shadows", "awakening"],
    "rating": 8.9,
    "createdAt": "2024-12-15T08:20:00.000Z",
    "openedAt": "2025-02-07T14:10:30.000Z",
    "editedAt": "2025-02-07T18:45:10.000Z",
    "characters": [
      {
        "Name": "Sung Jin-Woo",
        "Image": "https://example.com/characters/sung-jin-woo.png"
      },
      {
        "Name": "Cha Hae-In",
        "Image": "https://example.com/characters/cha-hae-in.png"
      },
      {
        "Name": "Go Gun-Hee",
        "Image": "https://example.com/characters/go-gun-hee.png"
      }
    ],
    "rows": [
      {
        "ChapterSE": "Episode 1 – The Weakest Hunter",
        "Description": "E-rank hunter Sung Jin-Woo barely survives a low-level dungeon while struggling to pay his family’s medical bills.",
        "Tags": ["introduction", "low-rank", "desperation"],
        "Characters": "Sung Jin-Woo"
      },
      {
        "ChapterSE": "Episode 2 – Double Dungeon",
        "Description": "A hidden dungeon reveals a deadly trial where survival depends on following cryptic rules.",
        "Tags": ["double-dungeon", "statues", "death"],
        "Characters": "Sung Jin-Woo, Dungeon Party"
      },
      {
        "ChapterSE": "Episode 3 – The System",
        "Description": "After facing death, Jin-Woo awakens to a mysterious system that only he can see.",
        "Tags": ["awakening", "system", "rebirth"],
        "Characters": "Sung Jin-Woo"
      }
    ],
    "category": "Manhwa",
    "dataType": "json"
  },
  // ...
]
```

</div>
</details>
