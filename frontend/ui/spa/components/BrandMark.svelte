<script>
  let { name = 'LL Dash', compact = false } = $props();
</script>

<div class="brand-mark" class:compact>
  <img src="/static/icons/icon-192.png" alt="" width="48" height="48" />
  <span class="brand-mark-name">{name}</span>
</div>
