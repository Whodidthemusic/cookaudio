// The Donate link opens Cash App directly if dialogs are unavailable; otherwise it shows the QR code first.
const donate = document.getElementById('donate');
const sheet = document.getElementById('donate-dialog');

if (donate && sheet && typeof sheet.showModal === 'function') {
  donate.setAttribute('aria-haspopup', 'dialog');
  donate.addEventListener('click', (event) => {
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    sheet.showModal();
  });
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) sheet.close();
  });
}
