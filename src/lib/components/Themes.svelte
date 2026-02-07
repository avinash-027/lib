<script lang="ts">
    import { theme } from '$lib/stores/theme.store';

    const themes: string[] = [
        'light', 'cupcake', 'night', 'dark', 'emerald',
        'fantasy', 'luxury', 'acid', 'coffee', 'retro',
        'business', 'dracula', 'dim', 'garden'
    ];

    type DropdownDirection =
        | 'dropdown-end' | 'dropdown-left' | 'dropdown-top' | 'dropdown-bottom'
        | 'dropdown-top dropdown-end' | 'dropdown-top dropdown-left'
        | 'dropdown-bottom dropdown-end' | 'dropdown-bottom dropdown-left'
        | 'dropdown-top dropdown-start' | 'dropdown-bottom dropdown-start';

    export let dropdownDirection: DropdownDirection = 'dropdown-end';

    function selectTheme(t: string) {
        theme.set(t);
    }
</script>

<div class={`dropdown ${dropdownDirection}`}>
    <div tabindex="0" role="button" class="btn p-2 m-0 rounded-2xl">🎨
        <svg width="12px" height="12px" class="inline-block h-1 w-1 fill-current opacity-60"
             xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">
            <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
        </svg>
    </div>

    <ul tabindex="-1" class="dropdown-content menu bg-base-300 rounded-2xl z-150 w-52 p-2 shadow-sm">
        {#each themes as t}
            <li>
                <input type="radio"
                    name="theme-dropdown"
                    class="theme-controller btn btn-sm btn-block btn-ghost justify-start"
                    aria-label={t}
                    value={t}
                    on:change={() => selectTheme(t)}
                    checked={$theme === t} />
            </li>
        {/each}
    </ul>
</div>
