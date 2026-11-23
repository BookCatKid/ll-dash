<script>
  let { name, size = 20 } = $props();
</script>

<span
  class="ui-icon"
  aria-hidden="true"
  style:width="{size}px"
  style:height="{size}px"
  style:--ui-icon="url('/static/icons/nav/{name}.svg')"
></span>
