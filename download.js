// Set the anchor href to the published installer to switch on direct downloads.
const download = document.getElementById('download');
const release = document.getElementById('release-dialog');

if (download.getAttribute('href') === '#windows-release' && typeof release.showModal === 'function') {
  download.setAttribute('aria-haspopup', 'dialog');
  download.addEventListener('click', (event) => {
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    release.showModal();
  });
}
