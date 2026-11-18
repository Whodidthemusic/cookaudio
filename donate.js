// The Donate links open Cash App directly if dialogs are unavailable; otherwise they show the QR code first.
const donate = document.querySelectorAll('#donate, .donate-open');
const sheet = document.getElementById('donate-dialog');

if (donate.length && sheet && typeof sheet.showModal === 'function') {
  donate.forEach((link) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      sheet.showModal();
    });
  });
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) sheet.close();
  });
}
