// Download counter: shows how many times COOK has been downloaded and adds one when Download is pressed.
// The line stays hidden until the number arrives, so the page looks the same if the counter is ever offline.
const counterLine = document.getElementById('download-count');
const downloadLink = document.getElementById('download');
const counterApi = 'https://count.cookaudio.app';
let downloads = null;

function showDownloads(n) {
  if (!counterLine || !Number.isFinite(n)) return;
  downloads = n;
  counterLine.querySelector('strong').textContent = n.toLocaleString('en-US');
  counterLine.hidden = false;
}

if (counterLine && window.fetch) {
  fetch(counterApi + '/count', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => { if (data) showDownloads(Number(data.count)); })
    .catch(() => {});
}

if (downloadLink) {
  downloadLink.addEventListener('click', () => {
    // keepalive lets the request finish even though the browser is starting the download
    fetch(counterApi + '/hit', { method: 'POST', keepalive: true })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data) showDownloads(Number(data.count)); })
      .catch(() => {});
  });
}
