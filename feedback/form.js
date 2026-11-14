const form = document.querySelector('.feedback-form');
const hint = document.getElementById('details-hint');

function updateType() {
  const category = form.elements.Type.value;
  form.elements._subject.value = 'COOK · ' + category;
  hint.textContent = category === 'Bug report'
    ? 'What did you do, what happened, and what did you expect? Include your COOK version if you know it.'
    : 'What would you like to do in COOK, and how would it help your workflow?';
}

form.addEventListener('change', event => {
  if (event.target.name === 'Type') updateType();
});
window.addEventListener('pageshow', updateType);
updateType();

const send = form.querySelector('button[type="submit"]');
const status = document.getElementById('send-status');
if (window.fetch && window.AbortController) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (send.disabled) return;
    const payload = Object.fromEntries(new FormData(form));
    const endpoint = new URL(form.action);
    endpoint.pathname = '/ajax' + endpoint.pathname;
    send.disabled = true;
    status.textContent = 'Sending…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || String(result.success) !== 'true') throw new Error('Submission unconfirmed');
      location.assign('./thanks.html');
    } catch {
      status.textContent = 'Delivery could not be confirmed. Your feedback is still here. Please try again.';
      send.disabled = false;
    } finally {
      clearTimeout(timer);
    }
  });
  window.addEventListener('pageshow', () => {
    send.disabled = false;
    status.textContent = '';
  });
}
