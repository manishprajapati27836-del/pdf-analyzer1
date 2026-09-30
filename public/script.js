pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const $ = (id) => document.getElementById(id);
const fileInput = $('file'), goBtn = $('go'), statusEl = $('status'), resultEl = $('result');
const MAX_CHARS = 60000;
let currentFile = null;
let extractedText = '';

fetch('/api/me').then((r) => r.ok ? r.json() : null).then((d) => { if (d) $('who').textContent = d.email; });

$('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

function setFile(f) {
  if (!f) return;
  if (f.type !== 'application/pdf') return setStatus('Please choose a PDF file.', true);
  currentFile = f;
  extractedText = '';
  $('stats').classList.add('hidden');
  $('qa').classList.add('hidden');
  $('answer').classList.add('hidden');
  resultEl.classList.add('hidden');
  $('qaStatus').textContent = '';
  $('qaStatus').classList.remove('error');
  $('fileLabel').textContent = f.name;
  goBtn.disabled = false;
  setStatus('');
}
function setStatus(text, isError = false, loading = false) {
  statusEl.className = 'status' + (isError ? ' error' : '');
  statusEl.textContent = '';
  if (loading) { const s = document.createElement('span'); s.className = 'spinner'; statusEl.appendChild(s); }
  statusEl.appendChild(document.createTextNode(text));
}

fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
const dz = $('dropzone');
['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));

async function extractText(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages && text.length < MAX_CHARS; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n\n';
  }
  return { text: text.trim(), pages: pdf.numPages };
}

goBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  goBtn.disabled = true;
  resultEl.classList.add('hidden');
  try {
    setStatus('Reading the PDF…', false, true);
    const extracted = await extractText(currentFile);
    extractedText = extracted.text;
    if (!extractedText) throw new Error('No text found. This looks like a scanned PDF (image only).');
    $('pageCount').textContent = extracted.pages;
    $('wordCount').textContent = extractedText.split(/\s+/).filter(Boolean).length;
    $('charCount').textContent = extractedText.length;
    $('stats').classList.remove('hidden');
    $('qa').classList.remove('hidden');
    setStatus('Summarizing…', false, true);
    const res = await fetch('/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText, filename: currentFile.name })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not summarize.');
    render(data);
    setStatus('');
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    goBtn.disabled = false;
  }
});

$('qaForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const question = $('question').value.trim();
  if (!question || !extractedText) return;

  const askBtn = $('ask');
  const answerEl = $('answer');
  askBtn.disabled = true;
  answerEl.classList.add('hidden');
  $('qaStatus').classList.remove('error');
  $('qaStatus').textContent = 'Thinking…';

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText, question })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not answer your question.');
    answerEl.textContent = data.answer;
    answerEl.classList.remove('hidden');
    $('qaStatus').textContent = '';
  } catch (err) {
    $('qaStatus').textContent = err.message;
    $('qaStatus').classList.add('error');
  } finally {
    askBtn.disabled = false;
  }
});

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function listSection(title, items, wrapClass) {
  const s = el('section', wrapClass); s.appendChild(el('h3', null, title));
  const ul = el('ul'); (items || []).forEach((t) => ul.appendChild(el('li', null, t)));
  s.appendChild(ul); return s;
}
function render(d) {
  resultEl.textContent = '';
  resultEl.appendChild(el('span', 'kind', d.doc_type || 'Document'));
  resultEl.appendChild(el('h2', null, d.title || 'Summary'));
  resultEl.appendChild(el('p', null, d.overview || ''));
  resultEl.appendChild(listSection('Key points', d.key_points));
  const t = el('section'); t.appendChild(el('h3', null, 'Themes'));
  const tags = el('div', 'tags'); (d.themes || []).forEach((x) => tags.appendChild(el('span', 'tag', x)));
  t.appendChild(tags); resultEl.appendChild(t);
  resultEl.appendChild(listSection('Worth remembering', d.notable, 'notable'));
  resultEl.classList.remove('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
