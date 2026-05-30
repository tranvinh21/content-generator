const form = document.querySelector('#generatorForm');
const phraseText = document.querySelector('#phraseText');
const videoData = document.querySelector('#videoData');
const layout = document.querySelector('#layout');
const gapMs = document.querySelector('#gapMs');
const showMovieInfo = document.querySelector('#showMovieInfo');
const generateButton = document.querySelector('#generateButton');
const searchButton = document.querySelector('#searchButton');
const loadSampleButton = document.querySelector('#loadSampleButton');
const searchLimit = document.querySelector('#searchLimit');
const searchLanguage = document.querySelector('#searchLanguage');
const statusText = document.querySelector('#statusText');
const logOutput = document.querySelector('#logOutput');
const resultsList = document.querySelector('#resultsList');
const emptyPreview = document.querySelector('#emptyPreview');

const setStatus = (message, isError = false) => {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
};

const setBusy = (isBusy) => {
  generateButton.disabled = isBusy;
  generateButton.innerHTML = isBusy
    ? '<span class="button-icon">…</span>Generating'
    : '<span class="button-icon">▶</span>Generate video';
};

const setSearchBusy = (isBusy) => {
  searchButton.disabled = isBusy;
  searchButton.textContent = isBusy ? 'Searching' : 'Search';
};

const loadSample = async () => {
  const response = await fetch('/api/sample');
  const payload = await response.json();

  videoData.value = JSON.stringify(payload.clips, null, 2);
  setStatus('Example loaded');
  logOutput.textContent = 'Enter your text, paste your JSON video data, then generate the MP4.';
};

const clearResults = () => {
  resultsList.querySelectorAll('.result-item').forEach((item) => item.remove());
  emptyPreview.classList.remove('hidden');
};

const renderResults = (files) => {
  clearResults();

  files.forEach((file) => {
    const item = document.createElement('article');
    item.className = 'result-item';

    const title = document.createElement('div');
    title.className = 'result-title';
    title.innerHTML = `<strong>Clip ${file.clipIndex}</strong><span>${file.text || file.fileName}</span>`;

    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.src = `${file.downloadUrl}?t=${Date.now()}`;

    const download = document.createElement('a');
    download.className = 'download-button';
    download.href = file.downloadUrl;
    download.download = file.fileName;
    download.textContent = 'Download MP4';

    item.append(title, video, download);
    resultsList.append(item);
  });

  emptyPreview.classList.toggle('hidden', files.length > 0);
};

loadSampleButton.addEventListener('click', () => {
  loadSample().catch((error) => {
    setStatus('Could not load sample', true);
    logOutput.textContent = error.message;
  });
});

searchButton.addEventListener('click', async () => {
  setSearchBusy(true);
  setStatus('Searching Playphrase...');
  logOutput.textContent = 'Searching clips from Playphrase.';
  clearResults();

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        query: phraseText.value,
        limit: Number(searchLimit.value),
        language: searchLanguage.value,
      }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || 'Search failed.');
    }

    videoData.value = JSON.stringify(payload.clips, null, 2);
    setStatus(`${payload.count} clips found`);
    logOutput.textContent = 'Search complete. Review the JSON, then generate the MP4 files.';
  } catch (error) {
    setStatus('Search failed', true);
    logOutput.textContent = error instanceof Error ? error.message : 'Search failed.';
  } finally {
    setSearchBusy(false);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(true);
  setStatus('Rendering videos...');
  logOutput.textContent = 'Rendering one MP4 per JSON item.';
  clearResults();

  try {
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        phraseText: phraseText.value,
        videoData: videoData.value,
        layout: layout.value,
        gapMs: Number(gapMs.value),
        showMovieInfo: showMovieInfo.checked,
      }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || 'Render failed.');
    }

    const files = Array.isArray(payload.files) ? payload.files : [];

    setStatus(files.length === 1 ? 'Video ready' : `${files.length} videos ready`);
    logOutput.textContent = payload.log || 'Render complete.';
    renderResults(files);
  } catch (error) {
    setStatus('Render failed', true);
    logOutput.textContent = error instanceof Error ? error.message : 'Render failed.';
  } finally {
    setBusy(false);
  }
});

loadSample();
