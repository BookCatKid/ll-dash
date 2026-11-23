const openDialogs = [];
let previousPageOverflow = null;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateElement(element, keyframes, duration) {
  if (!element || reducedMotion() || !element.animate) return Promise.resolve();

  const animation = element.animate(keyframes, {
    duration,
    easing: 'cubic-bezier(.2, .8, .2, 1)',
    fill: 'both',
  });

  return animation.finished.catch(() => {}).finally(() => animation.cancel());
}

function focusableElements(dialog) {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return [...dialog.querySelectorAll(selector)].filter(element => {
    return element.getClientRects().length > 0;
  });
}

function handleKeydown(event) {
  const top = openDialogs.at(-1);
  if (!top || top.closing) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    void closeDialog(top.element);
    return;
  }

  if (event.key !== 'Tab') return;

  const elements = focusableElements(top.sheet);
  if (!elements.length) {
    event.preventDefault();
    top.sheet.focus();
    return;
  }

  const first = elements[0];
  const last = elements.at(-1);
  if (event.shiftKey && (document.activeElement === first || !top.sheet.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !top.sheet.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

export function openDialog(element, options = {}) {
  if (openDialogs.some(dialog => dialog.element === element)) return;

  const sheet = element.querySelector('.modal-sheet');
  if (!sheet) throw new Error('Dialog requires a modal-sheet');

  const state = {
    element,
    sheet,
    backdrop: element.querySelector('.modal-backdrop'),
    returnFocus: document.activeElement,
    removeOnClose: Boolean(options.removeOnClose),
    onClose: options.onClose,
    closing: false,
    cleanup: new AbortController(),
  };

  if (openDialogs.length === 0) {
    previousPageOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeydown);
  }

  openDialogs.push(state);
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('tabindex', '-1');

  const title = sheet.querySelector('.modal-title')?.textContent?.trim();
  if (title) sheet.setAttribute('aria-label', title);

  element.classList.remove('hidden');
  element.addEventListener('click', event => {
    if (event.target === state.backdrop || event.target.closest('.modal-close')) {
      void closeDialog(element);
    }
  }, {signal: state.cleanup.signal});

  void animateElement(state.backdrop, [{opacity: 0}, {opacity: 1}], 170);
  void animateElement(sheet, [
    {opacity: .75, transform: 'translateY(16px)'},
    {opacity: 1, transform: 'translateY(0)'},
  ], 210);

  requestAnimationFrame(() => {
    if (openDialogs.includes(state) && !state.closing) {
      (sheet.querySelector('.modal-close') || sheet).focus({preventScroll: true});
    }
  });
}

export async function closeDialog(element, immediate = false) {
  const state = openDialogs.find(dialog => dialog.element === element);
  if (!state || state.closing) return;
  state.closing = true;
  state.cleanup.abort();
  state.onClose?.();

  if (!immediate) {
    await Promise.all([
      animateElement(state.backdrop, [{opacity: 1}, {opacity: 0}], 140),
      animateElement(state.sheet, [
        {opacity: 1, transform: 'translateY(0)'},
        {opacity: .8, transform: 'translateY(12px)'},
      ], 170),
    ]);
  }

  if (state.removeOnClose) element.remove();
  else element.classList.add('hidden');

  openDialogs.splice(openDialogs.indexOf(state), 1);
  if (openDialogs.length === 0) {
    document.documentElement.style.overflow = previousPageOverflow || '';
    previousPageOverflow = null;
    document.removeEventListener('keydown', handleKeydown);
  }

  if (state.returnFocus?.isConnected) {
    state.returnFocus.focus({preventScroll: true});
  }
}

export function closeAllDialogs(immediate = false) {
  return Promise.all([...openDialogs].reverse().map(dialog => closeDialog(dialog.element, immediate)));
}
