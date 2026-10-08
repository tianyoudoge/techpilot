/** Dialog lifecycle: keep focus inside, preserve background scroll and fit the visible viewport. */
import { nextTick, onUnmounted, ref, watch, type Ref } from "vue";

export function useAppDialog(
  open: () => boolean,
  dialog: Ref<HTMLElement | undefined>,
  close: () => void,
) {
  const viewportHeight = ref(
    window.visualViewport?.height || window.innerHeight,
  );
  const viewportTop = ref(window.visualViewport?.offsetTop || 0);
  let previousFocus: HTMLElement | null = null;
  let previousOverflow = "";
  let locked = false;
  function resize() {
    viewportHeight.value = window.visualViewport?.height || window.innerHeight;
    viewportTop.value = window.visualViewport?.offsetTop || 0;
  }
  function release() {
    window.visualViewport?.removeEventListener("resize", resize);
    window.visualViewport?.removeEventListener("scroll", resize);
    window.removeEventListener("resize", resize);
    if (locked) document.body.style.overflow = previousOverflow;
    locked = false;
  }
  watch(
    open,
    async (value) => {
      if (value) {
        previousFocus =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        locked = true;
        resize();
        window.visualViewport?.addEventListener("resize", resize);
        window.visualViewport?.addEventListener("scroll", resize);
        window.addEventListener("resize", resize);
        await nextTick();
        // Focus the selected provider instead of forcing the phone keyboard to open.
        if (open())
          (
            dialog.value?.querySelector<HTMLElement>(
              '[aria-selected="true"],button:not(:disabled)',
            ) || dialog.value
          )?.focus({ preventScroll: true });
      } else {
        release();
        await nextTick();
        if (previousFocus?.isConnected)
          previousFocus.focus({ preventScroll: true });
      }
    },
    { immediate: true },
  );
  onUnmounted(release);
  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = dialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
    );
    if (!items?.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return { viewportHeight, viewportTop, onKeydown };
}
