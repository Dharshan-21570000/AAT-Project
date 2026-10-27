"use strict";

(() => {
  const API_BASE = "https://openlibrary.org";
  const COVER_BASE = "https://covers.openlibrary.org";
  const SEARCH_LIMIT = 24;
  const STORAGE_KEYS = {
    favorites: "wdl-favorites",
    reading: "wdl-reading-list",
    history: "wdl-search-history",
    theme: "wdl-theme"
  };
  const CATEGORIES = [
    { name: "Computer Science", subject: "computer science", icon: "⌘" },
    { name: "Artificial Intelligence", subject: "artificial intelligence", icon: "✧" },
    { name: "Machine Learning", subject: "machine learning", icon: "◈" },
    { name: "Programming", subject: "programming", icon: "{ }" },
    { name: "Science", subject: "science", icon: "⚗" },
    { name: "Mathematics", subject: "mathematics", icon: "∑" },
    { name: "Engineering", subject: "engineering", icon: "⚙" },
    { name: "Medicine", subject: "medicine", icon: "✚" },
    { name: "History", subject: "history", icon: "◷" },
    { name: "Geography", subject: "geography", icon: "◎" },
    { name: "Fiction", subject: "fiction", icon: "✎" },
    { name: "Mystery", subject: "mystery", icon: "◌" },
    { name: "Romance", subject: "romance", icon: "♡" },
    { name: "Fantasy", subject: "fantasy", icon: "✦" },
    { name: "Philosophy", subject: "philosophy", icon: "◉" },
    { name: "Psychology", subject: "psychology", icon: "⌘" },
    { name: "Business", subject: "business", icon: "▤" },
    { name: "Economics", subject: "economics", icon: "↗" },
    { name: "Education", subject: "education", icon: "⌂" },
    { name: "Children's Books", subject: "juvenile literature", icon: "☆" },
    { name: "Literature", subject: "literature", icon: "❝" },
    { name: "Tamil Books", subject: "Tamil language", icon: "அ" },
    { name: "English Books", subject: "English language", icon: "A" },
    { name: "Hindi Books", subject: "Hindi language", icon: "अ" },
    { name: "Competitive Exam Preparation", subject: "competitive exam", icon: "✓" }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const elements = {
    searchForm: $("#search-form"),
    searchInput: $("#search-input"),
    searchScope: $("#search-scope"),
    clearSearch: $("#clear-search"),
    resultsSection: $("#search-results"),
    resultsTitle: $("#results-title"),
    resultsSummary: $("#results-summary"),
    resultsToolbar: $("#results-toolbar"),
    resultsMessage: $("#results-message"),
    resultsGrid: $("#results-grid"),
    loadMoreWrap: $("#load-more-wrap"),
    loadMore: $("#load-more"),
    featured: $("#featured-books"),
    recent: $("#recent-books"),
    categoryGrid: $("#category-grid"),
    historySection: $("#search-history"),
    historyList: $("#history-list"),
    libraryGrid: $("#library-grid"),
    libraryTotal: $("#library-total"),
    favoriteCount: $("#favorite-count"),
    readingCount: $("#reading-count"),
    libraryCount: $("#library-count"),
    libraryTabs: [...document.querySelectorAll(".library-tab")],
    dialog: $("#book-dialog"),
    dialogContent: $("#dialog-content"),
    menuToggle: $(".menu-toggle"),
    navigation: $("#primary-navigation"),
    themeToggle: $(".theme-toggle"),
    backToTop: $("#back-to-top"),
    toastRegion: $("#toast-region")
  };
  const state = {
    query: "",
    scope: "q",
    page: 1,
    total: 0,
    documents: [],
    visibleDocuments: [],
    requestId: 0,
    controller: null,
    loadingMore: false,
    listTab: "favorites",
    favorites: loadStoredList(STORAGE_KEYS.favorites),
    reading: loadStoredList(STORAGE_KEYS.reading),
    history: loadStoredHistory(),
    requestCache: new Map(),
    activeDialogBook: null
  };

  function readStorage(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : JSON.parse(stored);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      showToast("Your browser could not save this change. Check your storage settings.", "error");
      return false;
    }
  }

  function loadStoredList(key) {
    const value = readStorage(key, []);
    if (!Array.isArray(value)) return [];
    return value.filter(book => book && typeof book.key === "string" && typeof book.title === "string");
  }

  function loadStoredHistory() {
    const value = readStorage(STORAGE_KEYS.history, []);
    return Array.isArray(value)
      ? value.filter(item => item && typeof item.query === "string" && typeof item.scope === "string").slice(0, 10)
      : [];
  }

  function saveList(key, books, destination) {
    if (!writeStorage(key, books)) return false;
    state[destination] = books;
    updateLibraryCounts();
    if (destination === state.listTab) renderLibrary();
    return true;
  }

  function safeText(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "";
  }

  function cleanList(value, maximum = 3) {
    if (!Array.isArray(value)) return [];
    return value.map(item => safeText(item)).filter(Boolean).slice(0, maximum);
  }

  function normalizedBook(doc) {
    const key = safeText(doc.key);
    const title = safeText(doc.title);
    if (!/^\/works\/[A-Za-z0-9_-]+$/.test(key) || !title) return null;
    return {
      key,
      title,
      author_name: cleanList(doc.author_name),
      first_publish_year: Number.isInteger(Number(doc.first_publish_year)) && Number(doc.first_publish_year) > 0 ? Number(doc.first_publish_year) : null,
      publisher: cleanList(doc.publisher, 2),
      isbn: cleanList(doc.isbn, 3),
      subject: cleanList(doc.subject, 12),
      language: cleanList(doc.language, 12),
      cover_i: Number.isInteger(Number(doc.cover_i)) ? Number(doc.cover_i) : null,
      ia: cleanList(doc.ia, 4),
      ebook_access: safeText(doc.ebook_access),
      public_scan_b: doc.public_scan_b === true,
      has_fulltext: doc.has_fulltext === true,
      edition_count: Number.isInteger(Number(doc.edition_count)) ? Number(doc.edition_count) : null
    };
  }

  function coverUrl(book, size = "M") {
    if (book.cover_i) return `${COVER_BASE}/b/id/${encodeURIComponent(book.cover_i)}-${size}.jpg`;
    const isbn = book.isbn && book.isbn[0];
    return isbn ? `${COVER_BASE}/b/isbn/${encodeURIComponent(isbn)}-${size}.jpg` : "";
  }

  function createCover(book, className, size = "M") {
    const wrapper = document.createElement("div");
    wrapper.className = className;
    const url = coverUrl(book, size);
    if (!url) {
      const placeholder = document.createElement("span");
      placeholder.className = "cover-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "W";
      wrapper.append(placeholder);
      return wrapper;
    }
    const image = document.createElement("img");
    image.className = "card-cover";
    image.src = url;
    image.alt = `Cover of ${book.title}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      wrapper.replaceChildren();
      const placeholder = document.createElement("span");
      placeholder.className = "cover-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = "W";
      wrapper.append(placeholder);
    }, { once: true });
    wrapper.append(image);
    return wrapper;
  }

  function safeExternalLink(url, label, className = "dialog-link", primary = false) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return null;
      const link = document.createElement("a");
      link.className = primary ? `${className} primary-link` : className;
      link.href = parsed.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      return link;
    } catch {
      return null;
    }
  }

  function createSkeletons(container, count = 6) {
    container.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const card = document.createElement("div");
      card.className = "skeleton-card";
      card.setAttribute("aria-hidden", "true");
      const cover = document.createElement("div");
      cover.className = "skeleton-cover";
      const lines = document.createElement("div");
      lines.className = "skeleton-lines";
      for (let line = 0; line < 3; line += 1) {
        const skeletonLine = document.createElement("div");
        skeletonLine.className = "skeleton-line";
        lines.append(skeletonLine);
      }
      card.append(cover, lines);
      container.append(card);
    }
  }

  function showEmpty(container, title, message) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✳";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const description = document.createElement("span");
    description.textContent = message;
    empty.append(icon, heading, description);
    container.replaceChildren(empty);
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    elements.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function searchUrl(query, scope, page = 1, limit = SEARCH_LIMIT) {
    const params = new URLSearchParams();
    params.set(scope, query);
    params.set("limit", String(limit));
    params.set("page", String(page));
    params.set("fields", "key,title,author_name,first_publish_year,publisher,isbn,subject,language,cover_i,ia,ebook_access,public_scan_b,has_fulltext,edition_count");
    return `${API_BASE}/search.json?${params.toString()}`;
  }

  async function fetchSearch(query, scope, page = 1, limit = SEARCH_LIMIT, signal) {
    const url = searchUrl(query, scope, page, limit);
    const cacheKey = url;
    if (state.requestCache.has(cacheKey)) return state.requestCache.get(cacheKey);
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Open Library returned status ${response.status}.`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.docs)) throw new Error("The book catalogue returned an unexpected response.");
    const result = {
      total: Number.isFinite(Number(payload.numFound ?? payload.num_found)) ? Number(payload.numFound ?? payload.num_found) : 0,
      docs: payload.docs.map(normalizedBook).filter(Boolean)
    };
    state.requestCache.set(cacheKey, result);
    if (state.requestCache.size > 50) state.requestCache.delete(state.requestCache.keys().next().value);
    return result;
  }

  function formatQueryLabel(query, scope) {
    const scopeLabel = {
      q: "all fields",
      title: "title",
      author: "author",
      isbn: "ISBN",
      subject: "subject"
    }[scope] || "all fields";
    return `Showing books for “${query}” · searched by ${scopeLabel}`;
  }

  function setResultsHeading(title, summary) {
    elements.resultsTitle.textContent = title;
    elements.resultsSummary.textContent = summary;
  }

  function recordHistory(query, scope) {
    const history = [{ query, scope }, ...state.history.filter(item => item.query.toLowerCase() !== query.toLowerCase() || item.scope !== scope)].slice(0, 10);
    if (writeStorage(STORAGE_KEYS.history, history)) {
      state.history = history;
      renderHistory();
    }
  }

  async function runSearch(query, scope = "q", options = {}) {
    const normalizedQuery = safeText(query).replace(/\s+/g, " ").slice(0, 180);
    if (normalizedQuery.length < 2) {
      showToast("Enter at least two characters to search the catalogue.", "error");
      elements.searchInput.focus();
      return;
    }
    if (!/^[\p{L}\p{N}\s.,:;'"()&+/_-]+$/u.test(normalizedQuery)) {
      showToast("Please remove unsupported symbols from your search.", "error");
      return;
    }
    if (!["q", "title", "author", "isbn", "subject"].includes(scope)) scope = "q";
    state.controller?.abort();
    state.controller = new AbortController();
    const signal = state.controller.signal;
    const requestId = ++state.requestId;
    state.query = normalizedQuery;
    state.scope = scope;
    state.page = 1;
    state.documents = [];
    state.visibleDocuments = [];
    $("#filter-author").value = "";
    $("#filter-year").value = "";
    $("#filter-language").value = "";
    $("#filter-subject").value = "";
    $("#sort-results").value = "relevance";
    elements.searchInput.value = normalizedQuery;
    elements.searchScope.value = scope;
    elements.clearSearch.hidden = false;
    elements.resultsSection.hidden = false;
    elements.historySection.hidden = true;
    elements.resultsToolbar.hidden = true;
    elements.loadMoreWrap.hidden = true;
    elements.resultsMessage.className = "results-message";
    elements.resultsMessage.textContent = "";
    setResultsHeading(options.heading || "Search results", formatQueryLabel(normalizedQuery, scope));
    createSkeletons(elements.resultsGrid, 6);
    elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!options.fromHistory) recordHistory(normalizedQuery, scope);
    try {
      const result = await fetchSearch(normalizedQuery, scope, 1, SEARCH_LIMIT, signal);
      if (requestId !== state.requestId) return;
      state.total = result.total;
      state.documents = [...result.docs];
      populateFilterOptions();
      applyFiltersAndRender();
    } catch (error) {
      if (error.name === "AbortError" || requestId !== state.requestId) return;
      elements.resultsGrid.replaceChildren();
      elements.resultsToolbar.hidden = true;
      elements.resultsMessage.className = "results-message error-message";
      elements.resultsMessage.textContent = "We couldn't reach the book catalogue. Check your internet connection and try again.";
      setResultsHeading(options.heading || "Search results", "The Open Library catalogue could not be reached.");
      showToast("Book search failed. Please try again in a moment.", "error");
    }
  }

  function renderBookCard(book) {
    const card = document.createElement("article");
    card.className = "book-card";
    const mainButton = document.createElement("button");
    mainButton.className = "card-main";
    mainButton.type = "button";
    mainButton.setAttribute("aria-label", `View details for ${book.title}`);
    const cover = createCover(book, "card-cover-wrap");
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = book.title;
    const author = document.createElement("p");
    author.className = "card-author";
    author.textContent = book.author_name.length ? book.author_name.join(", ") : "Author not listed";
    const year = document.createElement("p");
    year.className = "card-year";
    year.textContent = book.first_publish_year ? `First published ${book.first_publish_year}` : "Publication year unavailable";
    const publisher = document.createElement("p");
    publisher.className = "card-publisher";
    publisher.textContent = book.publisher.length ? book.publisher[0] : "Publisher unavailable";
    meta.append(title, author, year, publisher);
    mainButton.append(cover, meta);
    mainButton.addEventListener("click", () => openBookDetails(book));
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const open = document.createElement("button");
    open.className = "card-open-link";
    open.type = "button";
    open.textContent = "View details →";
    open.addEventListener("click", () => openBookDetails(book));
    const saveActions = document.createElement("div");
    saveActions.className = "card-save-actions";
    saveActions.append(createSaveButton(book, "favorite"), createSaveButton(book, "reading"));
    actions.append(open, saveActions);
    card.append(mainButton, actions);
    return card;
  }

  function createSaveButton(book, type) {
    const isFavorite = type === "favorite";
    const saved = (isFavorite ? state.favorites : state.reading).some(item => item.key === book.key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `save-button${saved ? " is-saved" : ""}`;
    button.dataset.action = type;
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute("aria-label", `${saved ? "Remove from" : "Add to"} ${isFavorite ? "favourites" : "reading list"}: ${book.title}`);
    button.title = `${saved ? "Remove from" : "Add to"} ${isFavorite ? "favourites" : "reading list"}`;
    button.textContent = isFavorite ? (saved ? "♥" : "♡") : (saved ? "✓" : "+");
    button.addEventListener("click", () => toggleSavedBook(book, type));
    return button;
  }

  function toggleSavedBook(book, type) {
    const isFavorite = type === "favorite";
    const key = isFavorite ? STORAGE_KEYS.favorites : STORAGE_KEYS.reading;
    const destination = isFavorite ? "favorites" : "reading";
    const list = [...state[destination]];
    const index = list.findIndex(item => item.key === book.key);
    let saved;
    if (index >= 0) {
      list.splice(index, 1);
      saved = saveList(key, list, destination);
    } else {
      list.unshift(book);
      saved = saveList(key, list, destination);
    }
    if (saved) showToast(isFavorite
      ? (index >= 0 ? "Removed from your favourites." : "Added to your favourites.")
      : (index >= 0 ? "Removed from your reading list." : "Added to your reading list."));
    rerenderSaveButtons(book.key);
  }

  function rerenderSaveButtons(bookKey) {
    document.querySelectorAll(".save-button").forEach(button => {
      const card = button.closest(".book-card");
      if (!card) return;
      const matches = [...state.documents, ...state.favorites, ...state.reading].find(book => book.key === bookKey);
      if (!matches) return;
      const isFavorite = button.dataset.action === "favorite";
      const saved = (isFavorite ? state.favorites : state.reading).some(item => item.key === bookKey);
      button.classList.toggle("is-saved", saved);
      button.setAttribute("aria-pressed", String(saved));
      button.setAttribute("aria-label", `${saved ? "Remove from" : "Add to"} ${isFavorite ? "favourites" : "reading list"}: ${matches.title}`);
      button.title = `${saved ? "Remove from" : "Add to"} ${isFavorite ? "favourites" : "reading list"}`;
      button.textContent = isFavorite ? (saved ? "♥" : "♡") : (saved ? "✓" : "+");
    });
    if (state.activeDialogBook?.key === bookKey) renderDialogSaveButtons(state.activeDialogBook);
  }

  function populateFilterOptions() {
    const languages = [...new Set(state.documents.flatMap(book => book.language))].sort((a, b) => a.localeCompare(b));
    const subjects = [...new Set(state.documents.flatMap(book => book.subject))].sort((a, b) => a.localeCompare(b)).slice(0, 120);
    fillSelect($("#filter-language"), "All languages", languages);
    fillSelect($("#filter-subject"), "All subjects", subjects);
    const hasAuthor = state.documents.some(book => book.author_name.length);
    const hasYear = state.documents.some(book => book.first_publish_year);
    $("#filter-author").disabled = !hasAuthor;
    $("#filter-year").disabled = !hasYear;
    $("#filter-language").disabled = languages.length === 0;
    $("#filter-subject").disabled = subjects.length === 0;
  }

  function fillSelect(select, initialLabel, values) {
    const currentValue = select.value;
    const fragment = document.createDocumentFragment();
    const initialOption = document.createElement("option");
    initialOption.value = "";
    initialOption.textContent = initialLabel;
    fragment.append(initialOption);
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value.replaceAll("_", " ");
      fragment.append(option);
    }
    select.replaceChildren(fragment);
    if (values.includes(currentValue)) select.value = currentValue;
  }

  function applyFiltersAndRender() {
    const author = safeText($("#filter-author").value).toLocaleLowerCase();
    const year = $("#filter-year").value ? Number($("#filter-year").value) : null;
    const language = $("#filter-language").value;
    const subject = $("#filter-subject").value;
    let books = state.documents.filter(book => {
      if (author && (!book.author_name.length || !book.author_name.join(" ").toLocaleLowerCase().includes(author))) return false;
      if (year && (!book.first_publish_year || book.first_publish_year !== year)) return false;
      if (language && !book.language.includes(language)) return false;
      if (subject && !book.subject.includes(subject)) return false;
      return true;
    });
    const sortBy = $("#sort-results").value;
    if (sortBy === "title") books = [...books].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "year") books = [...books].sort((a, b) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
    state.visibleDocuments = books;
    renderResultCards();
    const shown = state.documents.length;
    const total = state.total.toLocaleString();
    elements.resultsSummary.textContent = `${formatQueryLabel(state.query, state.scope)} · ${total} catalogue ${state.total === 1 ? "record" : "records"}`;
    elements.resultsToolbar.hidden = state.documents.length === 0;
    elements.resultsMessage.className = "results-message";
    elements.resultsMessage.textContent = books.length
      ? `Showing ${books.length} of ${shown} loaded books${(author || year || language || subject) ? " matching your filters" : ""}${state.total > shown ? ` · ${total} total catalogue records` : ""}.`
      : state.documents.length
        ? "No books on this page match those filters. Try adjusting them or load more books."
        : "No catalogue results were found. Try another title, author, ISBN, keyword, or subject.";
    elements.loadMoreWrap.hidden = state.documents.length >= state.total || state.documents.length === 0;
    elements.loadMore.disabled = state.loadingMore;
  }

  function renderResultCards() {
    const fragment = document.createDocumentFragment();
    for (const book of state.visibleDocuments) fragment.append(renderBookCard(book));
    if (fragment.childNodes.length) elements.resultsGrid.replaceChildren(fragment);
    else if (!state.documents.length) showEmpty(elements.resultsGrid, "No books found", "Try another title, author, ISBN, keyword, or subject.");
    else showEmpty(elements.resultsGrid, "No matching books", "Try changing one or more filters to widen your search.");
  }

  async function loadMoreResults() {
    if (state.loadingMore || state.documents.length >= state.total) return;
    state.loadingMore = true;
    const requestId = state.requestId;
    const nextPage = state.page + 1;
    const originalText = elements.loadMore.textContent;
    elements.loadMore.disabled = true;
    elements.loadMore.textContent = "Loading books…";
    try {
      const result = await fetchSearch(state.query, state.scope, nextPage, SEARCH_LIMIT, state.controller?.signal);
      if (requestId !== state.requestId) return;
      const seen = new Set(state.documents.map(book => book.key));
      state.documents.push(...result.docs.filter(book => !seen.has(book.key)));
      state.page = nextPage;
      state.total = result.total;
      populateFilterOptions();
      applyFiltersAndRender();
    } catch (error) {
      if (error.name !== "AbortError") {
        showToast("We couldn't load more books. Please try again.", "error");
        elements.loadMore.disabled = false;
      }
    } finally {
      state.loadingMore = false;
      elements.loadMore.textContent = originalText;
      elements.loadMore.disabled = false;
    }
  }

  function renderLibrary() {
    const list = state.listTab === "favorites" ? state.favorites : state.reading;
    const label = state.listTab === "favorites" ? "favourites" : "your reading list";
    if (!list.length) {
      showEmpty(elements.libraryGrid, state.listTab === "favorites" ? "Your favourites live here" : "Your reading list is waiting", `Save a book from search results to add it to ${label}.`);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const book of list) fragment.append(renderBookCard(book));
    elements.libraryGrid.replaceChildren(fragment);
  }

  function updateLibraryCounts() {
    elements.favoriteCount.textContent = String(state.favorites.length);
    elements.readingCount.textContent = String(state.reading.length);
    elements.libraryCount.textContent = String(state.favorites.length + state.reading.length);
    elements.libraryTotal.textContent = `${state.favorites.length + state.reading.length} saved ${state.favorites.length + state.reading.length === 1 ? "book" : "books"}`;
  }

  function renderHistory() {
    elements.historyList.replaceChildren();
    if (!state.history.length) {
      elements.historySection.hidden = true;
      return;
    }
    elements.historySection.hidden = false;
    for (const item of state.history) {
      const button = document.createElement("button");
      button.className = "history-chip";
      button.type = "button";
      button.setAttribute("aria-label", `Search again: ${item.query}`);
      const icon = document.createElement("span");
      icon.textContent = "↻";
      const query = document.createElement("span");
      query.textContent = item.query;
      button.append(icon, query);
      button.addEventListener("click", () => runSearch(item.query, item.scope, { fromHistory: true }));
      elements.historyList.append(button);
    }
  }

  function createFeaturedCard(book, label, index) {
    const button = document.createElement("button");
    button.className = "featured-card";
    button.type = "button";
    button.setAttribute("aria-label", `View details for ${book.title}`);
    button.style.backgroundColor = ["#536553", "#867358", "#6b534d", "#566b70"][index % 4];
    const url = coverUrl(book, "L");
    if (url) {
      const image = document.createElement("img");
      image.className = "featured-cover";
      image.src = url;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      button.append(image);
    }
    const copy = document.createElement("span");
    copy.className = "featured-copy";
    const labelElement = document.createElement("span");
    labelElement.className = "featured-label";
    labelElement.textContent = label;
    const title = document.createElement("strong");
    title.textContent = book.title;
    const author = document.createElement("small");
    author.textContent = book.author_name[0] || "Author not listed";
    copy.append(labelElement, title, author);
    button.append(copy);
    button.addEventListener("click", () => openBookDetails(book));
    return button;
  }

  async function loadEditorialSections() {
    const sections = [
      { container: elements.featured, query: "classic literature", scope: "subject", label: "TIMELESS READS", limit: 4 },
      { container: elements.recent, query: "climate change", scope: "q", label: "JUST DISCOVERED", limit: 4, sort: "new" }
    ];
    await Promise.all(sections.map(async section => {
      try {
        const url = new URL(searchUrl(section.query, section.scope, 1, 8));
        if (section.sort) url.searchParams.set("sort", section.sort);
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Catalogue returned status ${response.status}.`);
        const data = await response.json();
        const books = Array.isArray(data.docs) ? data.docs.map(normalizedBook).filter(Boolean).slice(0, section.limit) : [];
        if (!books.length) {
          showEmpty(section.container, "Nothing to show just yet", "Try exploring a subject or searching the catalogue.");
          return;
        }
        const cards = books.map((book, index) => createFeaturedCard(book, section.label, index));
        section.container.replaceChildren(...cards);
      } catch {
        showEmpty(section.container, "Catalogue unavailable", "Search for a book to explore the Open Library catalogue.");
      }
    }));
  }

  function appendFact(container, label, value) {
    if (!value) return;
    const pill = document.createElement("span");
    pill.className = "fact-pill";
    pill.textContent = `${label}: ${value}`;
    container.append(pill);
  }

  function renderDialogSaveButtons(book) {
    const container = $("#dialog-save-actions", elements.dialogContent);
    if (!container) return;
    container.replaceChildren(createSaveButton(book, "favorite"), createSaveButton(book, "reading"));
  }

  function renderDescription(container, description) {
    let text = "";
    if (typeof description === "string") text = description;
    else if (description && typeof description.value === "string") text = description.value;
    if (text) {
      const paragraph = document.createElement("p");
      paragraph.className = "dialog-description";
      paragraph.textContent = text.slice(0, 3500);
      container.append(paragraph);
    } else {
      const paragraph = document.createElement("p");
      paragraph.className = "dialog-note";
      paragraph.textContent = "A description is not available in the catalogue record.";
      container.append(paragraph);
    }
  }

  async function loadWorkDescription(book, descriptionElement, requestToken) {
    const match = book.key.match(/^\/works\/([A-Za-z0-9_-]+)$/);
    if (!match) {
      renderDescription(descriptionElement, null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/works/${encodeURIComponent(match[1])}.json`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Work details returned status ${response.status}.`);
      const work = await response.json();
      if (requestToken !== state.activeDialogBook?.key) return;
      descriptionElement.replaceChildren();
      renderDescription(descriptionElement, work.description);
    } catch {
      if (requestToken !== state.activeDialogBook?.key) return;
      descriptionElement.replaceChildren();
      renderDescription(descriptionElement, null);
    }
  }

  async function discoverGutenberg(book, container, requestToken) {
    const queryParts = [book.title, book.author_name[0]].filter(Boolean);
    if (!queryParts.length) {
      const note = document.createElement("p");
      note.className = "availability-status";
      note.textContent = "Title and author details are needed to look for an edition.";
      container.append(note);
      return;
    }
    const status = document.createElement("p");
    status.className = "availability-status";
    status.textContent = "Checking Project Gutenberg's public-domain catalogue…";
    container.append(status);
    try {
      const params = new URLSearchParams({ search: queryParts.join(" ") });
      const response = await fetch(`https://gutendex.com/books/?${params}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Project Gutenberg returned status ${response.status}.`);
      const result = await response.json();
      if (requestToken !== state.activeDialogBook?.key) return;
      const title = book.title.toLocaleLowerCase();
      const author = (book.author_name[0] || "").toLocaleLowerCase();
      const candidates = Array.isArray(result.results) ? result.results : [];
      const exactMatch = candidates.find(candidate => {
        const candidateTitle = safeText(candidate.title).toLocaleLowerCase();
        const candidateAuthors = Array.isArray(candidate.authors) ? candidate.authors.map(entry => safeText(entry.name).toLocaleLowerCase()) : [];
        const titleMatches = candidateTitle === title || candidateTitle.includes(title) || title.includes(candidateTitle);
        const authorMatches = !author || candidateAuthors.some(candidateAuthor => candidateAuthor.includes(author) || author.includes(candidateAuthor));
        return titleMatches && authorMatches;
      });
      status.remove();
      if (!exactMatch || !Number.isInteger(exactMatch.id)) {
        const note = document.createElement("p");
        note.className = "availability-status";
        note.textContent = "No closely matching Project Gutenberg edition was found. This does not mean no authorized edition exists elsewhere.";
        container.append(note);
        return;
      }
      const resultBox = document.createElement("div");
      resultBox.className = "gutenberg-result";
      const resultTitle = document.createElement("strong");
      resultTitle.textContent = `Project Gutenberg: ${safeText(exactMatch.title) || book.title}`;
      const message = document.createElement("p");
      message.className = "availability-status";
      message.textContent = "This provider lists a public-domain ebook. Check the edition and applicable local laws before use.";
      resultBox.append(resultTitle, message);
      const formats = exactMatch.formats && typeof exactMatch.formats === "object" ? exactMatch.formats : {};
      const preferred = ["text/html", "application/epub+zip", "application/pdf", "text/plain; charset=utf-8", "text/plain"];
      const links = [];
      for (const format of preferred) {
        const link = formats[format];
        if (typeof link === "string") {
          const safeLink = safeExternalLink(link, format.includes("epub") ? "EPUB" : format.includes("pdf") ? "PDF" : format.includes("html") ? "Read online" : "Plain text");
          if (safeLink) links.push(safeLink);
        }
      }
      if (!links.length) {
        const catalogLink = safeExternalLink(`https://www.gutenberg.org/ebooks/${exactMatch.id}`, "View Gutenberg edition");
        if (catalogLink) links.push(catalogLink);
      }
      const linkGroup = document.createElement("div");
      linkGroup.className = "dialog-actions";
      linkGroup.append(...links);
      resultBox.append(linkGroup);
      container.append(resultBox);
    } catch {
      if (requestToken !== state.activeDialogBook?.key) return;
      status.textContent = "Project Gutenberg's catalogue could not be checked right now.";
    }
  }

  function openBookDetails(book) {
    state.activeDialogBook = book;
    elements.dialogContent.replaceChildren();
    const layout = document.createElement("div");
    layout.className = "dialog-top";
    const cover = createCover(book, "dialog-cover-wrap", "L");
    const image = $(".card-cover", cover);
    if (image) image.className = "dialog-cover";
    const meta = document.createElement("div");
    meta.className = "dialog-meta";
    const heading = document.createElement("h2");
    heading.id = "dialog-title";
    heading.textContent = book.title;
    const author = document.createElement("p");
    author.className = "dialog-author";
    author.textContent = book.author_name.length ? `by ${book.author_name.join(", ")}` : "Author information is not available.";
    const facts = document.createElement("div");
    facts.className = "dialog-facts";
    appendFact(facts, "First published", book.first_publish_year ? String(book.first_publish_year) : "");
    book.publisher.forEach(publisher => appendFact(facts, "Publisher", publisher));
    book.isbn.slice(0, 2).forEach(isbn => appendFact(facts, "ISBN", isbn));
    if (book.edition_count) appendFact(facts, "Editions", String(book.edition_count));
    meta.append(heading, author, facts);
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const openLibraryUrl = new URL(book.key, API_BASE);
    const recordLink = safeExternalLink(openLibraryUrl.href, "Open Library record", "dialog-link", true);
    if (recordLink) actions.append(recordLink);
    if (book.ia[0]) {
      const archiveLink = safeExternalLink(`https://archive.org/details/${encodeURIComponent(book.ia[0])}`, "Internet Archive edition");
      if (archiveLink) actions.append(archiveLink);
    }
    const archiveQuery = new URLSearchParams({ query: `${book.title}${book.author_name[0] ? ` ${book.author_name[0]}` : ""}` });
    const archiveSearchLink = safeExternalLink(`https://archive.org/search?${archiveQuery}`, "Search Internet Archive");
    if (archiveSearchLink) actions.append(archiveSearchLink);
    const hasOnlineAccess = ["public", "borrowable", "printdisabled"].includes(book.ebook_access) || book.public_scan_b || book.has_fulltext;
    if (hasOnlineAccess) {
      const readLink = safeExternalLink(`https://openlibrary.org${book.key}`, "Check reading access");
      if (readLink) actions.append(readLink);
    }
    const googleQuery = new URLSearchParams({ q: `${book.title}${book.author_name[0] ? ` ${book.author_name[0]}` : ""}` });
    const googleLink = safeExternalLink(`https://books.google.com/books?${googleQuery}`, "Find on Google Books");
    if (googleLink) actions.append(googleLink);
    const saveActions = document.createElement("div");
    saveActions.id = "dialog-save-actions";
    saveActions.className = "dialog-actions";
    saveActions.append(createSaveButton(book, "favorite"), createSaveButton(book, "reading"));
    meta.append(actions, saveActions);
    layout.append(cover, meta);

    const descriptionSection = document.createElement("section");
    descriptionSection.className = "dialog-bottom";
    const descriptionTitle = document.createElement("h3");
    descriptionTitle.textContent = "About this book";
    const description = document.createElement("div");
    description.className = "dialog-description";
    const loadingDescription = document.createElement("p");
    loadingDescription.className = "availability-status";
    loadingDescription.textContent = "Loading catalogue description…";
    description.append(loadingDescription);
    descriptionSection.append(descriptionTitle, description);

    const subjectsSection = document.createElement("section");
    subjectsSection.className = "dialog-bottom";
    const subjectsTitle = document.createElement("h3");
    subjectsTitle.textContent = "Subjects";
    const subjectList = document.createElement("div");
    subjectList.className = "dialog-subjects";
    if (book.subject.length) {
      for (const subject of book.subject) {
        const chip = document.createElement("span");
        chip.textContent = subject;
        subjectList.append(chip);
      }
    } else {
      const note = document.createElement("p");
      note.className = "dialog-note";
      note.textContent = "Subject information is not available.";
      subjectList.append(note);
    }
    subjectsSection.append(subjectsTitle, subjectList);

    const availability = document.createElement("section");
    availability.className = "dialog-bottom";
    const availabilityTitle = document.createElement("h3");
    availabilityTitle.textContent = "Reading & availability";
    const availabilityText = document.createElement("p");
    availabilityText.className = "availability-status";
    availabilityText.textContent = book.ia.length ? "An Internet Archive edition is listed for this record. Availability, lending, and reading permissions are set by the provider." : "No Internet Archive edition is linked from this record. Check each provider for availability and terms.";
    const gutenberg = document.createElement("div");
    availability.append(availabilityTitle, availabilityText, gutenberg);
    elements.dialogContent.append(layout, descriptionSection, subjectsSection, availability);
    const requestToken = book.key;
    if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
    else elements.dialog.setAttribute("open", "");
    loadWorkDescription(book, description, requestToken);
    discoverGutenberg(book, gutenberg, requestToken);
  }

  function renderCategoryButtons() {
    const icons = document.createDocumentFragment();
    for (const category of CATEGORIES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-chip";
      const icon = document.createElement("span");
      icon.className = "category-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = category.icon;
      const label = document.createElement("span");
      label.textContent = category.name;
      button.append(icon, label);
      button.addEventListener("click", () => {
        runSearch(category.subject, "subject", { heading: category.name });
        closeMobileMenu();
      });
      icons.append(button);
    }
    elements.categoryGrid.replaceChildren(icons);
  }

  function closeMobileMenu() {
    elements.navigation.classList.remove("is-open");
    elements.menuToggle.setAttribute("aria-expanded", "false");
    elements.menuToggle.setAttribute("aria-label", "Open navigation");
  }

  function applyTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalized;
    elements.themeToggle.querySelector(".theme-icon").textContent = normalized === "dark" ? "☀" : "☾";
    elements.themeToggle.setAttribute("aria-label", `Switch to ${normalized === "dark" ? "light" : "dark"} mode`);
    elements.themeToggle.title = `Switch to ${normalized === "dark" ? "light" : "dark"} mode`;
    const themeColor = $("meta[name='theme-color']");
    if (themeColor) themeColor.content = normalized === "dark" ? "#191b19" : "#f7f6f2";
  }

  function initializeEvents() {
    elements.searchForm.addEventListener("submit", event => {
      event.preventDefault();
      runSearch(elements.searchInput.value, elements.searchScope.value);
    });
    elements.searchInput.addEventListener("input", () => {
      elements.clearSearch.hidden = !elements.searchInput.value;
    });
    elements.clearSearch.addEventListener("click", () => {
      elements.searchInput.value = "";
      elements.clearSearch.hidden = true;
      elements.searchInput.focus();
    });
    document.querySelectorAll(".popular-searches button").forEach(button => {
      button.addEventListener("click", () => runSearch(button.dataset.search || "world literature", "q"));
    });
    elements.loadMore.addEventListener("click", loadMoreResults);
    ["#filter-author", "#filter-year", "#filter-language", "#filter-subject", "#sort-results"].forEach(selector => {
      const eventName = ["#filter-language", "#filter-subject", "#sort-results"].includes(selector) ? "change" : "input";
      $(selector).addEventListener(eventName, applyFiltersAndRender);
    });
    $("#clear-results").addEventListener("click", () => {
      state.controller?.abort();
      state.query = "";
      state.documents = [];
      state.visibleDocuments = [];
      elements.resultsSection.hidden = true;
      elements.searchInput.value = "";
      elements.clearSearch.hidden = true;
      elements.searchInput.focus();
      window.location.hash = "home";
    });
    $("#clear-history").addEventListener("click", () => {
      if (writeStorage(STORAGE_KEYS.history, [])) {
        state.history = [];
        renderHistory();
        showToast("Your recent searches have been cleared.");
      }
    });
    elements.libraryTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        state.listTab = tab.dataset.list === "reading" ? "reading" : "favorites";
        for (const item of elements.libraryTabs) {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        }
        $("#library-grid").setAttribute("aria-labelledby", tab.id);
        renderLibrary();
      });
    });
    elements.themeToggle.addEventListener("click", () => {
      const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      if (writeStorage(STORAGE_KEYS.theme, theme)) applyTheme(theme);
    });
    elements.menuToggle.addEventListener("click", () => {
      const isOpen = elements.menuToggle.getAttribute("aria-expanded") === "true";
      elements.menuToggle.setAttribute("aria-expanded", String(!isOpen));
      elements.menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      elements.navigation.classList.toggle("is-open", !isOpen);
    });
    elements.navigation.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMobileMenu));
    $("#dialog-close").addEventListener("click", () => elements.dialog.close());
    elements.dialog.addEventListener("click", event => {
      if (event.target === elements.dialog) elements.dialog.close();
    });
    elements.dialog.addEventListener("close", () => {
      state.activeDialogBook = null;
      elements.dialogContent.replaceChildren();
    });
    $("#contact-form").addEventListener("submit", event => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity()) return;
      showToast("No email service is configured, so your message was not sent or stored.", "error");
    });
    elements.backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener("scroll", () => {
      elements.backToTop.classList.toggle("is-visible", window.scrollY > 500);
    }, { passive: true });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && elements.navigation.classList.contains("is-open")) closeMobileMenu();
    });
  }

  function initialize() {
    const storedTheme = readStorage(STORAGE_KEYS.theme, "light");
    applyTheme(storedTheme);
    renderCategoryButtons();
    updateLibraryCounts();
    renderHistory();
    renderLibrary();
    initializeEvents();
    $("#current-year").textContent = String(new Date().getFullYear());
    loadEditorialSections();
  }

  initialize();
})();
