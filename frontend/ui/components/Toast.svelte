<script>
  import { fly } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';

  let { message } = $props();
  const reduceMotion = prefersReducedMotion;
</script>

{#if $message}
  <div
    class="toast"
    role="status"
    aria-live="polite"
    in:fly={{ y: 8, duration: reduceMotion.current ? 0 : 190 }}
    out:fly={{ y: 8, duration: reduceMotion.current ? 0 : 150 }}
  >
    {$message}
  </div>
{/if}
