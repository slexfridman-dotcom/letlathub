const isSearchEngineBot = /Googlebot|Google-InspectionTool|Bingbot|Slurp|DuckDuckBot|YandexBot|Baiduspider|Applebot|facebookexternalhit|Twitterbot|LinkedInBot|AhrefsBot|SemrushBot/i.test(navigator.userAgent);

const menuButton = document.querySelector('.mobile-menu-btn');
const menu = menuButton && document.getElementById(menuButton.getAttribute('aria-controls'));
const mobileViewport = window.matchMedia('(max-width: 768px)');

function setMenuOpen(isOpen) {
  if (!menuButton || !menu) return;

  menu.classList.toggle('is-open', isOpen);
  menuButton.classList.toggle('is-open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
}

if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a') && mobileViewport.matches) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('click', (event) => {
    if (
      mobileViewport.matches &&
      menuButton.getAttribute('aria-expanded') === 'true' &&
      event.target instanceof Node &&
      !menu.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      menuButton.focus();
    }
  });

  mobileViewport.addEventListener('change', () => setMenuOpen(false));
}

const previewMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.video-card video.card-preview-video').forEach((video) => {
  const card = video.closest('.video-card');
  if (!card) return;
  const previewError = card.querySelector('[data-preview-error]');
  const audioButton = card.querySelector('[data-preview-audio]');
  const mutedMark = audioButton?.querySelector('[data-audio-muted-mark]');
  const soundWaves = audioButton?.querySelectorAll('[data-audio-wave-one], [data-audio-wave-two]');
  const audioLabel = audioButton?.querySelector('[data-audio-label]');
  video.muted = true;
  video.volume = 1;

  function updateAudioControl() {
    if (!(audioButton instanceof HTMLButtonElement)) return;
    audioButton.hidden = false;
    audioButton.setAttribute('aria-label', video.muted ? 'Unmute video preview' : 'Mute video preview');
    audioButton.setAttribute('aria-pressed', String(!video.muted));
    if (audioLabel) audioLabel.textContent = video.muted ? 'Unmute' : 'Mute';
    if (mutedMark instanceof SVGElement) mutedMark.hidden = !video.muted;
    soundWaves?.forEach((wave) => {
      if (wave instanceof SVGElement) wave.hidden = video.muted;
    });
  }

  function showPreviewError() {
    card.classList.remove('is-previewing');
    video.muted = true;
    updateAudioControl();
    if (previewError instanceof HTMLElement) previewError.hidden = false;
  }

  const stopPreview = () => {
    card.classList.remove('is-previewing');
    video.pause();
    if (video.readyState > 0) video.currentTime = 0;
    video.muted = true;
    updateAudioControl();
  };

  const startPreview = (unmuted = false) => {
    const isRequestedRestrictedPreview = video.classList.contains('restricted-card-video');
    const shouldSkipForReducedMotion = previewMotionPreference.matches && !unmuted && !isRequestedRestrictedPreview;
    if (shouldSkipForReducedMotion || document.hidden || card.dataset.previewError === 'true') return;
    card.classList.add('is-previewing');
    video.muted = !unmuted;
    video.volume = 1;
    updateAudioControl();
    const playback = video.play();
    if (playback) {
      playback.catch((error) => {
        if (error.name === 'AbortError') return;
        card.dataset.previewError = 'true';
        showPreviewError();
      });
    }
  };

  audioButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (video.paused || video.ended) {
      startPreview(video.muted);
      return;
    }
    video.muted = !video.muted;
    video.volume = 1;
    updateAudioControl();
  });

  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') startPreview();
  });
  card.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
    stopPreview();
  });
  card.addEventListener('focusin', () => startPreview());
  card.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget)) stopPreview();
  });
  video.addEventListener('error', () => {
    card.dataset.previewError = 'true';
    showPreviewError();
  });
  updateAudioControl();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPreview();
  });
  previewMotionPreference.addEventListener('change', () => {
    if (previewMotionPreference.matches) stopPreview();
  });
});

const reactionButtons = Array.from(document.querySelectorAll('[data-video-reaction]'));
const actionMessage = document.querySelector('[data-video-action-message]');
reactionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const wasPressed = button.getAttribute('aria-pressed') === 'true';
    reactionButtons.forEach((reaction) => reaction.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', String(!wasPressed));
    if (actionMessage) {
      actionMessage.textContent = wasPressed
        ? 'Reaction removed.'
        : button.getAttribute('data-video-reaction') === 'like' ? 'You liked this video.' : 'You disliked this video.';
    }
  });
});

const shareButton = document.querySelector('[data-video-share]');
shareButton?.addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url: window.location.href });
      if (actionMessage) actionMessage.textContent = 'Shared.';
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (actionMessage) actionMessage.textContent = `Unable to share: ${error.message}`;
      return;
    }
  }

  if (!navigator.clipboard) {
    if (actionMessage) actionMessage.textContent = 'Sharing is unavailable in this browser.';
    return;
  }
  try {
    await navigator.clipboard.writeText(window.location.href);
    if (actionMessage) actionMessage.textContent = 'Link copied.';
  } catch (error) {
    if (actionMessage) actionMessage.textContent = `Unable to copy link: ${error.message}`;
  }
});

const loginForm = document.querySelector('[data-login-form]');
const loginNotice = document.querySelector('[data-login-notice]');
loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (loginNotice) loginNotice.textContent = 'Please subscribe first to get access.';
});

const heroCarousel = document.querySelector('[data-hero-carousel]');
if (heroCarousel) {
  const slides = Array.from(heroCarousel.querySelectorAll('[data-carousel-slide]'));
  const dots = Array.from(heroCarousel.querySelectorAll('[data-carousel-dot]'));
  const previousButton = heroCarousel.querySelector('[data-carousel-previous]');
  const nextButton = heroCarousel.querySelector('[data-carousel-next]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeSlide = 0;
  let timer = null;
  let pointerIsOver = false;
  let focusIsWithin = false;

  function showSlide(index) {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeSlide;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      dots[slideIndex]?.setAttribute('aria-current', String(isActive));
    });
  }

  function stopAutoplay() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function updateAutoplay() {
    if (reducedMotion.matches || document.hidden || pointerIsOver || focusIsWithin || slides.length < 2) {
      stopAutoplay();
      return;
    }
    if (timer === null) {
      timer = window.setInterval(() => showSlide(activeSlide + 1), 5000);
    }
  }

  if (slides.length > 1 && dots.length === slides.length) {
    dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
    previousButton?.addEventListener('click', () => showSlide(activeSlide - 1));
    nextButton?.addEventListener('click', () => showSlide(activeSlide + 1));
    heroCarousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showSlide(activeSlide + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    heroCarousel.addEventListener('pointerenter', () => {
      pointerIsOver = true;
      updateAutoplay();
    });
    heroCarousel.addEventListener('pointerleave', () => {
      pointerIsOver = false;
      updateAutoplay();
    });
    heroCarousel.addEventListener('focusin', () => {
      focusIsWithin = true;
      updateAutoplay();
    });
    heroCarousel.addEventListener('focusout', (event) => {
      if (event.relatedTarget instanceof Node && heroCarousel.contains(event.relatedTarget)) return;
      focusIsWithin = false;
      updateAutoplay();
    });
    document.addEventListener('visibilitychange', updateAutoplay);
    reducedMotion.addEventListener('change', updateAutoplay);
    updateAutoplay();
  }
}

const supportChat = document.querySelector('[data-support-chat]');
if (supportChat) {
  const toggle = supportChat.querySelector('[data-chat-toggle]');
  const panel = supportChat.querySelector('#supportChatPanel');
  const closeButton = supportChat.querySelector('[data-chat-close]');
  const messages = supportChat.querySelector('[data-chat-messages]');
  const answers = {
    plans: {
      question: 'How do I choose a package?',
      answer: 'Choose a daily, weekly, monthly, yearly, or unlimited pass on the subscriptions page. Then message our support team to purchase it.',
    },
    payment: {
      question: 'Which payment methods are available?',
      answer: 'Telebirr and CBE Birr are coming soon. Contact our support team on Telegram for current payment options.',
    },
    access: {
      question: 'How do I get access?',
      answer: 'Message support with your chosen package. They will guide you through payment and membership access.',
    },
    support: {
      question: 'How do I contact support?',
      answer: 'Tap the Telegram button below to chat with @Letlat_hub_support for additional support.',
    },
  };

  function appendChatMessage(message, isBot) {
    if (!(messages instanceof HTMLElement)) return;
    const bubble = document.createElement('article');
    bubble.className = `chat-message ${isBot ? 'chat-message--bot' : 'chat-message--user'}`;

    if (isBot) {
      const sender = document.createElement('span');
      sender.className = 'chat-message-sender';
      const avatar = document.createElement('span');
      avatar.className = 'chat-bot-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = 'L';
      sender.append(avatar, document.createTextNode('LetLat Support Bot'));
      bubble.append(sender);
    }

    const text = document.createElement('p');
    text.textContent = message;
    bubble.append(text);
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function setChatOpen(isOpen, restoreFocus = false) {
    if (!(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
    panel.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      supportChat.querySelector('[data-chat-question]')?.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle?.addEventListener('click', () => {
    setChatOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  closeButton?.addEventListener('click', () => setChatOpen(false, true));
  supportChat.querySelectorAll('[data-chat-question]').forEach((question) => {
    question.addEventListener('click', () => {
      const response = answers[question.getAttribute('data-chat-question')];
      if (!response) return;
      appendChatMessage(response.question, false);
      appendChatMessage(response.answer, true);
    });
  });
  document.addEventListener('click', (event) => {
    if (
      toggle instanceof HTMLButtonElement &&
      toggle.getAttribute('aria-expanded') === 'true' &&
      event.target instanceof Node &&
      !supportChat.contains(event.target)
    ) {
      setChatOpen(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setChatOpen(false, true);
    }
  });
}

const selectedPlanName = document.querySelector('#selectedPlanName');
const selectedPlanPrice = document.querySelector('#selectedPlanPrice');
const plans = {
  daily: { name: 'Daily pass', price: '150 ETB / day' },
  weekly: { name: 'Weekly pass', price: '300 ETB / week' },
  monthly: { name: 'Monthly pass', price: '998 ETB / month' },
  yearly: { name: 'Annual pass', price: '2,996 ETB / year' },
  unlimited: { name: 'Unlimited pass', price: '5,999 ETB one-time' },
};
const selectedPlan = plans[new URLSearchParams(window.location.search).get('plan')];
if (selectedPlanName && selectedPlanPrice) {
  if (selectedPlan) {
    selectedPlanName.textContent = selectedPlan.name;
    selectedPlanPrice.textContent = selectedPlan.price;
  }
}

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
