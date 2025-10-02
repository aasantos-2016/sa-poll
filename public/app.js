const root = document.getElementById('app');

const state = {
  view: 'welcome',
  participantId: null,
  participantName: '',
  movies: [],
  currentIndex: 0,
  currentAnswers: { watched: null, remembered: null },
  responses: {},
  loading: false,
  error: null,
};

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });
}

function sanitizePosterUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const base = window.location.origin;
    const parsed = new URL(trimmed, base);
    return parsed.href;
  } catch (error) {
    return '';
  }
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function resetAnswers() {
  state.currentAnswers = { watched: null, remembered: null };
}

function welcomeTemplate() {
  return `
    <section class="card">
      <span class="pill">Pesquisa de Filmes</span>
      <h1>Ajude-nos a descobrir os filmes mais assistidos</h1>
      <p>Vamos mostrar uma lista especial de filmes. Conte se você já assistiu e se ainda se lembra deles. É rapidinho!</p>
      ${state.error ? `<div class="error">${state.error}</div>` : ''}
      <form id="welcome-form" autocomplete="off">
        <div>
          <label for="participant-name">Qual é o seu nome?</label>
          <input id="participant-name" name="participant-name" type="text" placeholder="ex.: Juliana" maxlength="60" required ${state.loading ? 'disabled' : ''} />
        </div>
        <button class="button" type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Carregando…' : 'Começar pesquisa'}</button>
      </form>
      <p class="footer-note">Suas respostas são anônimas e servem apenas para entender os filmes mais vistos pelo grupo.</p>
    </section>
  `;
}

function questionTemplate() {
  const movie = state.movies[state.currentIndex];
  const total = state.movies.length;
  const step = state.currentIndex + 1;
  const progress = Math.round(((step - 1) / total) * 100);
  const nextDisabled = state.loading || state.currentAnswers.watched === null || state.currentAnswers.remembered === null;
  const safeTitle = escapeHtml(String(movie.title));
  const safeYear = movie.year ? Number(movie.year) : '';
  const memoryDisabled = state.currentAnswers.watched === false;
  const posterUrl = sanitizePosterUrl(movie.posterUrl);
  const posterAlt = escapeHtml(`Pôster do filme ${String(movie.title)}`);
  const memoryHintClass = `question-hint${memoryDisabled ? ' visible' : ''}`;
  const memoryHintAccessibility = memoryDisabled ? 'aria-live="polite"' : 'aria-hidden="true"';

  return `
    <section class="card question-card">
      <div class="progress">
        <span>${state.participantName ? `Olá ${state.participantName}, ` : ''}Filme ${step} de ${total}</span>
        <span>${progress}% concluído</span>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="question-layout">
        <div class="poster-frame">
          ${posterUrl
            ? `<img src="${posterUrl}" alt="${posterAlt}" loading="lazy" decoding="async" />`
            : '<div class="poster-placeholder">Pôster indisponível</div>'}
        </div>
        <div class="question-main">
          <div class="question-movie">
            <span class="pill">Em cartaz</span>
            <span class="movie-title">${safeTitle}</span>
            <span class="movie-year">${safeYear}</span>
          </div>
          ${state.error ? `<div class="error">${state.error}</div>` : ''}
          <div class="question-group" data-question="watched">
            <p class="question-title">Você já assistiu a este filme?</p>
            <div class="options">
              ${optionButton('watched', true, 'Sim, já assisti')}
              ${optionButton('watched', false, 'Não, ainda não')}
            </div>
          </div>
          <div class="question-group" data-question="remembered">
            <p class="question-title">Você se lembra bem dele?</p>
            <p class="${memoryHintClass}" ${memoryHintAccessibility}>Como você ainda não assistiu, marcamos "Não" automaticamente.</p>
            <div class="options">
              ${optionButton('remembered', true, 'Sim, lembro bem', { disabled: memoryDisabled })}
              ${optionButton('remembered', false, 'Não lembro muito', { disabled: memoryDisabled })}
            </div>
          </div>
          <button class="button" id="next-button" ${nextDisabled ? 'disabled' : ''}>${state.loading ? 'Salvando…' : step === total ? 'Finalizar' : 'Próximo filme'}</button>
        </div>
      </div>
    </section>
  `;
}

function optionButton(question, value, label, { disabled = false } = {}) {
  const isActive = state.currentAnswers[question] === value;
  const isDisabled = disabled || state.loading;
  return `
    <button
      type="button"
      class="option-button ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
      data-question="${question}"
      data-value="${value}"
      ${isDisabled ? 'disabled' : ''}
      aria-pressed="${isActive}"
    >${label}</button>
  `;
}

function successTemplate() {
  const total = state.movies.length;
  const watchedCount = Object.values(state.responses).filter((r) => r.watched).length;
  const rememberedCount = Object.values(state.responses).filter((r) => r.remembered).length;

  return `
    <section class="card success-card">
      <span class="pill">Muito obrigado</span>
      <h2>Até a próxima, ${state.participantName || 'amante de cinema'}!</h2>
      <p>Você marcou <strong>${watchedCount}</strong> de <strong>${total}</strong> filmes como assistidos.</p>
      <p>E ainda se lembra de <strong>${rememberedCount}</strong> deles.</p>
      <p class="footer-note">Pode fechar esta janela — suas respostas foram salvas com sucesso.</p>
    </section>
  `;
}

function render() {
  switch (state.view) {
    case 'welcome':
      root.innerHTML = welcomeTemplate();
      bindWelcomeEvents();
      break;
    case 'question':
      root.innerHTML = questionTemplate();
      bindQuestionEvents();
      setupPosterFallbacks();
      break;
    case 'complete':
      root.innerHTML = successTemplate();
      break;
    default:
      root.textContent = 'Algo deu errado.';
  }
}

function bindWelcomeEvents() {
  const form = document.getElementById('welcome-form');
  const nameInput = document.getElementById('participant-name');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.loading) return;

    const name = nameInput.value.trim();
    if (!name) {
      setState({ error: 'Informe seu nome para continuar.' });
      return;
    }

    setState({ loading: true, error: null });

    try {
      const participantId = await createParticipant(name);
      const movies = await fetchMovies();

      if (!movies.length) {
        setState({ error: 'Nenhum filme disponível no momento. Tente novamente mais tarde.', loading: false });
        return;
      }

      const displayName = escapeHtml(name);
      setState({
        participantId,
        participantName: displayName,
        movies,
        currentIndex: 0,
        responses: {},
        loading: false,
        view: 'question',
        error: null,
      });
      resetAnswers();
      render();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error && error.message ? error.message : 'Não foi possível iniciar a pesquisa. Tente novamente.';
      setState({
        loading: false,
        error: message,
      });
    }
  });
}

function bindQuestionEvents() {
  document.querySelectorAll('.option-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.loading) return;
      const question = button.dataset.question;
      const value = button.dataset.value === 'true';
      if (question === 'remembered' && state.currentAnswers.watched === false) {
        return;
      }

      if (question === 'watched') {
        state.currentAnswers.watched = value;
        if (value === false) {
          state.currentAnswers.remembered = false;
        } else {
          state.currentAnswers.remembered = null;
        }
      } else if (question === 'remembered') {
        state.currentAnswers.remembered = value;
      }
      render();
    });
  });

  document.getElementById('next-button')?.addEventListener('click', async () => {
    if (state.loading) return;
    if (state.currentAnswers.watched === null || state.currentAnswers.remembered === null) {
      return;
    }

    const movie = state.movies[state.currentIndex];

    setState({ loading: true, error: null });

    try {
      await submitResponse({
        participantId: state.participantId,
        movieId: movie.id,
        watched: state.currentAnswers.watched,
        remembered: state.currentAnswers.remembered,
      });

      state.responses[movie.id] = { ...state.currentAnswers };

      const isLastMovie = state.currentIndex >= state.movies.length - 1;

      if (isLastMovie) {
        setState({
          view: 'complete',
          loading: false,
          error: null,
        });
        return;
      }

      const nextIndex = state.currentIndex + 1;
      resetAnswers();
      setState({ currentIndex: nextIndex, loading: false, error: null });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error && error.message ? error.message : 'Não foi possível salvar a resposta. Verifique sua conexão e tente novamente.';
      setState({
        loading: false,
        error: message,
      });
    }
  });
}

function setupPosterFallbacks() {
  document.querySelectorAll('.poster-frame img').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        const frame = img.closest('.poster-frame');
        if (!frame) {
          return;
        }

        img.remove();

        if (!frame.querySelector('.poster-placeholder')) {
          const placeholder = document.createElement('div');
          placeholder.className = 'poster-placeholder';
          placeholder.textContent = 'Pôster indisponível';
          frame.appendChild(placeholder);
        }

        frame.classList.add('poster-missing');
      },
      { once: true }
    );
  });
}

async function createParticipant(name) {
  const response = await fetch('/api/participants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Não foi possível criar o participante.');
  }

  const data = await response.json();
  return data.participantId;
}

async function fetchMovies() {
  const response = await fetch('/api/movies');
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Não foi possível carregar os filmes.');
  }

  const data = await response.json();
  return data.movies || [];
}

async function submitResponse(payload) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || 'Não foi possível salvar a resposta';
    throw new Error(message);
  }

  return response.json();
}

render();
