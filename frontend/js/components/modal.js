// A simple pop-up window. Example:
//   const modal = openModal('Add service', '<form>...</form>');
//   modal.body.querySelector('form').onsubmit = ...;
//   modal.close();
import { icon } from '../icons.js';
import { esc } from '../utils.js';

export function openModal(title, bodyHtml) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-label="${esc(title)}">
        <div class="modal-header">
          <h2>${esc(title)}</h2>
          <button class="secondary icon-only modal-close" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>`;
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('.modal-close').onclick = close;
    backdrop.onclick = event => { if (event.target === backdrop) close(); };   // click outside closes
    backdrop.querySelectorAll('[data-close]').forEach(b => { b.onclick = close; });

    return { body: backdrop.querySelector('.modal-body'), close: close };
}
