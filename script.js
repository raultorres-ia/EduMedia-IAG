// --- THEME MANAGEMENT ---
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const systemIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`;

function applyTheme(theme) {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function updateToggleIcon(theme) {
    if (theme === 'dark') {
        themeToggle.innerHTML = moonIcon;
    } else if (theme === 'light') {
        themeToggle.innerHTML = sunIcon;
    } else {
        themeToggle.innerHTML = systemIcon;
    }
}

function cycleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'system';
    let newTheme;
    if (currentTheme === 'system') newTheme = 'light';
    else if (currentTheme === 'light') newTheme = 'dark';
    else newTheme = 'system';
    
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    updateToggleIcon(newTheme);
}

const savedTheme = localStorage.getItem('theme') || 'system';
applyTheme(savedTheme);
updateToggleIcon(savedTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
    }
});
themeToggle.addEventListener('click', cycleTheme);

// --- State ---
let allNewsletters = [];
let activeKeywords = [];
let expandedCards = new Set();
let yearUrls = {};
let currentAudio = null; // Global audio management
// MODIFICACIÓN: Variable para guardar el último año válido seleccionado
let currentDataYear = null; 

// --- Config URLs ---
const CONFIG_URL = 'https://raw.githubusercontent.com/raultorres-ia/EduMedia-IAG/refs/heads/main/config.json';
const CORS_PROXY = 'https://corsproxy.io/?';

// --- URL Management ---
function updateURLWithCard(cardId) {
    const url = new URL(window.location);
    url.searchParams.set('boletin', cardId);
    window.history.replaceState({}, '', url);
}

function getCardIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('boletin');
}

function copyToClipboard(text, message = 'Copiado al portapapeles') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message);
    }).catch(err => {
        console.error('Error al copiar al portapapeles:', err);
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(message);
        } catch (err) {
            showToast('No se pudo copiar automáticamente', 'error');
        }
        document.body.removeChild(textArea);
    });
}

function showToast(message, type = 'success') {
    const existingToast = document.getElementById('toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0 ${
        type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('translate-x-0'), 10);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function scrollToCard(cardId, isDirectLink = false) {
    const cardExists = allNewsletters.some(item => item.id === cardId);
    
    if (!cardExists) {
        showToast('Boletín no encontrado en el año actual', 'error');
        return;
    }

    const searchInput = document.getElementById('search-input');
    const monthFilter = document.getElementById('month-filter');
    const weekFilter = document.getElementById('week-filter');
    
    if (searchInput) searchInput.value = '';
    if (monthFilter) monthFilter.value = '';
    if (weekFilter) weekFilter.value = '';
    activeKeywords = [];
    
    applyFilters();
    
    setTimeout(() => {
        const targetCard = document.querySelector(`[data-id="${cardId}"]`);
        if (targetCard) {
            const card = targetCard.closest('.card');
            if (card) {
                window.highlightedCard = card;
                
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                card.classList.add('card-highlighted');
                
                if (!isDirectLink) {
                    setTimeout(() => {
                        if (card.classList.contains('card-highlighted')) {
                            card.classList.remove('card-highlighted');
                            window.highlightedCard = null;
                        }
                    }, 5000);
                }
                
                showToast('📍 Navegado al boletín seleccionado');
            }
        } else {
            showToast('Boletín no encontrado', 'error');
        }
    }, 500);
}

// --- Utility Functions ---
const normalizeText = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Audio management functions
function pauseCurrentAudio() {
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
    }
}

function setCurrentAudio(audioElement) {
    pauseCurrentAudio();
    currentAudio = audioElement;
}

function createAudioPlayer(src, isFullSize = false) {
    const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const controlsClass = isFullSize ? "w-full" : "w-full";
    
    const audioHTML = `
        <audio id="${audioId}" controls class="${controlsClass}" preload="metadata">
            <source src="${src}" type="audio/mpeg">
            Tu navegador no soporta el elemento de audio.
        </audio>
    `;
    
    setTimeout(() => {
        const audioElement = document.getElementById(audioId);
        if (audioElement) {
            audioElement.addEventListener('play', () => {
                setCurrentAudio(audioElement);
            });
        }
    }, 100);
    
    return audioHTML;
}

// --- Initialization ---
async function init() {
    try {
        const response = await fetch(CONFIG_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        yearUrls = await response.json();
        
        const latestYear = populateYearSelector();
        
        if (latestYear) {
            await loadAndProcessData(latestYear);
            
            const targetCardId = getCardIdFromURL();
            if (targetCardId) {
                setTimeout(() => {
                    scrollToCard(targetCardId, true);
                }, 1000);
            }
        }
    } catch (error) {
        console.error("Error initializing app:", error);
        showError("No se pudo cargar la configuración inicial.");
    }
}

function populateYearSelector() {
    const yearSelector = document.getElementById('year-selector');
    if (!yearSelector) return null;
    
    const yearsFromConfig = Object.keys(yearUrls).sort((a, b) => b - a);
    if (yearsFromConfig.length === 0) {
        showError("No se encontraron años en la configuración.");
        return null;
    }
    
    yearSelector.innerHTML = yearsFromConfig.map(year => `<option value="${year}">${year}</option>`).join('');
    
    const latestYear = yearsFromConfig[0];
    yearSelector.value = latestYear;
    return latestYear;
}

async function loadAndProcessData(year) {
    const newsletterGrid = document.getElementById('newsletter-grid');
    const noResults = document.getElementById('no-results');
    
    window.highlightedCard = null;
    pauseCurrentAudio();
    
    showLoader(true);
    if (newsletterGrid) {
        newsletterGrid.innerHTML = '';
        newsletterGrid.classList.remove('loaded');
    }
    if (noResults) noResults.classList.add('hidden');
    expandedCards.clear();
    
    const csvUrl = yearUrls[year];
    if (!csvUrl) {
        showError(`No se encontró URL para el año ${year}.`);
        return;
    }

    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(csvUrl)}`);
        if (!response.ok) throw new Error(`HTTP error fetching CSV! status: ${response.status}`);
        const csvText = await response.text();

        if (!csvText) throw new Error("El contenido del CSV está vacío.");

        allNewsletters = parseCSV(csvText);
        
        populateFilterOptions(allNewsletters);
        applyFilters();

    } catch (error) {
        console.error(`Error loading data for year ${year}:`, error);
        showError(`No se pudo cargar los datos del boletín para el año ${year}.`);
    } finally {
        showLoader(false);
    }
}

// ============================================================================================
// FUNCIÓN `parseCSV` CORREGIDA
// Esta función ahora procesa correctamente el CSV y mapea las columnas según la estructura
// del archivo `boletin.csv`.
// ============================================================================================
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const header = lines.shift(); // Quitamos la cabecera, no la usamos.
    
    const records = [];
    let currentRecord = '';

    // Juntamos las líneas que pertenecen al mismo registro (manejo de saltos de línea dentro de campos)
    for (const line of lines) {
        currentRecord += line + '\n';
        // Un registro termina si el número de comillas es par. Es una heurística, pero funciona para este CSV.
        if ((currentRecord.match(/"/g) || []).length % 2 === 0) {
            records.push(currentRecord.trim());
            currentRecord = '';
        }
    }
    if (currentRecord) { // Añadir el último registro si existe
        records.push(currentRecord.trim());
    }

    return records.map(row => {
        const values = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        values.push(currentField); // Añadir el último campo

        // Limpiamos las comillas que envuelven cada campo
        const cleanedValues = values.map(v => {
            let value = v.trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            // Reemplazamos las comillas dobles escapadas ("") por una sola comilla (")
            return value.replace(/""/g, '"');
        });

        if (cleanedValues.length < 9) {
            console.warn('Fila descartada por tener menos de 9 columnas:', cleanedValues);
            return null;
        }

        // --- MAPEO DE COLUMNAS CORREGIDO ---
        return {
            id: cleanedValues[1] ? cleanedValues[1].trim() : '',
            dateInfo: parseIdToDateInfo(cleanedValues[1] ? cleanedValues[1].trim() : ''),
            title: cleanedValues[3] ? cleanedValues[3].trim() : '',
            summary: cleanedValues[4] ? cleanedValues[4].trim() : '',
            // 'citas' ahora es el Cuerpo Principal, como en el modal
            citas: cleanedValues[5] ? cleanedValues[5].trim() : '', 
            // 'body' ahora es el Resumen, para compatibilidad con la lógica del modal
            body: cleanedValues[4] ? cleanedValues[4].trim() : '',
            // 'link' es el enlace al podcast/video
            link: cleanedValues[6] ? cleanedValues[6].trim() : '',
            // 'faq' es la sección de preguntas
            faq: cleanedValues[7] ? cleanedValues[7].trim() : '',
            // 'keywords' se extraen de la columna 8
            keywords: cleanedValues[8] ? cleanedValues[8].split(',').map(kw => kw.trim()).filter(kw => kw) : []
        };
    }).filter(item => item && item.id).sort((a, b) => b.dateInfo.startDate - a.dateInfo.startDate);
}


function renderCards(newsletters) {
    const newsletterGrid = document.getElementById('newsletter-grid');
    const noResults = document.getElementById('no-results');
    
    if (!newsletterGrid || !noResults) return;
    
    newsletterGrid.classList.remove('loaded');
    
    setTimeout(() => {
        newsletterGrid.innerHTML = '';
        if (newsletters.length === 0) {
            noResults.classList.remove('hidden');
            return;
        }
        noResults.classList.add('hidden');

        newsletters.forEach((item, index) => {
            const card = document.createElement('div');
            // MODIFICACIÓN: Se elimina la clase 'overflow-hidden' para que el cartel no se corte.
            card.className = 'card bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col border border-slate-200 dark:border-slate-700';
            card.style.animationDelay = `${index * 0.05}s`;
            
            const mediaEmbedHTML = generateMediaEmbed(item.link);
            const isExpanded = expandedCards.has(item.id);
            const keywordsToShow = isExpanded ? item.keywords : item.keywords.slice(0, 3);
            
            const keywordTags = keywordsToShow.map(kw => {
                const isActive = activeKeywords.includes(kw);
                const activeClass = isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900 dark:hover:text-emerald-300';
                return `<span class="tag text-xs px-2 py-0.5 rounded ${activeClass}">${kw}</span>`;
            }).join('');
            
            const remainingCount = item.keywords.length - 3;
            const expandButton = !isExpanded && remainingCount > 0 
                ? `<span class="expand-keywords text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer font-medium" data-card-id="${item.id}">+${remainingCount} más</span>` 
                : '';
            
            const collapseButton = isExpanded && item.keywords.length > 3
                ? `<span class="collapse-keywords text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer font-medium" data-card-id="${item.id}">mostrar menos</span>`
                : '';

            card.innerHTML = `
                <div class="p-5 flex-grow flex flex-col">
                    <div class="flex justify-between items-start mb-1">
                        <p class="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">${item.dateInfo.displayDate}</p>
                        <button class="share-btn text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded" 
                                data-share-id="${item.id}" 
                                title="Copiar enlace directo">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                <polyline points="16,6 12,2 8,6"/>
                                <line x1="12" y1="2" x2="12" y2="15"/>
                            </svg>
                        </button>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">${item.title}</h3>
                    <p class="text-slate-600 dark:text-slate-300 text-sm mb-4 flex-grow">${item.summary}</p>
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${keywordTags}
                        ${expandButton}
                        ${collapseButton}
                    </div>
                </div>
                ${mediaEmbedHTML ? `
                <div class="media-container p-4 bg-slate-100 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
                    ${mediaEmbedHTML}
                </div>
                ` : ''}
                <div class="p-4 bg-slate-50 dark:bg-slate-800/50">
                    <button data-id="${item.id}" class="read-more-btn w-full text-center font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                        Leer boletín →
                    </button>
                </div>
            `;
            newsletterGrid.appendChild(card);
        });
        
        requestAnimationFrame(() => {
            newsletterGrid.classList.add('loaded');
        });
    }, 150);
}

function populateFilterOptions(newsletters) {
    const monthFilter = document.getElementById('month-filter');
    const weekFilter = document.getElementById('week-filter');
    
    if (!monthFilter || !weekFilter) return;
    
    const months = new Set();
    const weeks = new Set();
    let currentYear = null;
    
    newsletters.forEach(item => {
        const date = item.dateInfo.startDate;
        if (!date || isNaN(date.getTime())) return;
        
        months.add(date.getMonth());
        weeks.add(getWeekNumber(date));
        
        if (!currentYear) {
            currentYear = date.getFullYear();
        }
    });
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthFilter.innerHTML = '<option value="">Todos los meses</option>' + [...months].sort((a,b) => a-b).map(m => `<option value="${m}">${monthNames[m]}</option>`).join('');
    
    const yearForWeeks = currentYear || new Date().getFullYear();
    
    let weekOptionsHTML = '<option value="">Todas las semanas</option>';
    weekOptionsHTML += [...weeks].sort((a,b) => a-b).map(w => `<option value="${w}">${formatWeekDisplay(w, yearForWeeks)}</option>`).join('');
    weekFilter.innerHTML = weekOptionsHTML;
}


function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const monthFilter = document.getElementById('month-filter');
    const weekFilter = document.getElementById('week-filter');
    
    if (!searchInput || !monthFilter || !weekFilter) return;
    
    const normalizedSearchTerm = normalizeText(searchInput.value);
    const selectedMonth = monthFilter.value;
    const selectedWeek = weekFilter.value;
    
    const filtered = allNewsletters.filter(item => {
        try {
            const date = item.dateInfo.startDate;
            if (!date || isNaN(date.getTime())) return false;

            const monthMatch = selectedMonth === '' || date.getMonth().toString() === selectedMonth;
            const weekMatch = selectedWeek === '' || getWeekNumber(date).toString() === selectedWeek;
            
            const keywordMatch = activeKeywords.length === 0 || activeKeywords.every(ak => item.keywords.some(ik => normalizeText(ik) === normalizeText(ak)));

            const searchMatch = normalizedSearchTerm === '' ||
                normalizeText(item.title).includes(normalizedSearchTerm) ||
                normalizeText(item.summary).includes(normalizedSearchTerm) ||
                normalizeText(item.citas).includes(normalizedSearchTerm) ||
                normalizeText(item.body).includes(normalizedSearchTerm) ||
                normalizeText(item.faq).includes(normalizedSearchTerm) ||
                item.keywords.some(kw => normalizeText(kw).includes(normalizedSearchTerm));

            return monthMatch && weekMatch && keywordMatch && searchMatch;
        } catch (e) {
            console.error("Error filtering item:", item, e);
            return false;
        }
    });
    renderCards(filtered);
}

function toggleKeywordFilter(keyword) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    const keywordIndex = activeKeywords.indexOf(keyword);

    if (keywordIndex > -1) {
        activeKeywords.splice(keywordIndex, 1);
    } else {
        activeKeywords.push(keyword);
    }
    
    applyFilters();
}

function expandCardKeywords(cardId) {
    expandedCards.add(cardId);
    applyFilters();
}

function collapseCardKeywords(cardId) {
    expandedCards.delete(cardId);
    applyFilters();
}

function processMarkdownContent(content) {
    if (!content) return '';
    
    const linkPlaceholders = new Map();
    let placeholderCounter = 0;
    
    let processed = content.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (match, text, url) => {
        if (!url || url.trim() === '' || url === 'undefined') {
            return text;
        }
        const placeholder = `__LINK_PLACEHOLDER_${placeholderCounter++}__`;
        linkPlaceholders.set(placeholder, `[${text}](${url})`);
        return placeholder;
    });
    
    processed = processed
        .replace(/https?:\/\/[^\s\)\]]+/g, (match) => {
            return `[${match}](${match})`;
        });
    
    linkPlaceholders.forEach((originalLink, placeholder) => {
        processed = processed.replace(placeholder, originalLink);
    });
    
    return processed;
}

function processExternalLinks(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const links = tempDiv.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://')) && !href.startsWith('#')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
    
    return tempDiv.innerHTML;
}

function generateTableOfContents(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
        return { toc: '<p class="text-slate-500 dark:text-slate-400 italic">No se encontraron títulos.</p>', content: htmlContent };
    }
    
    let tocHtml = '<nav class="space-y-2">';
    headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent.trim();
        const id = `heading-${index}`;
        
        heading.id = id;
        
        const indent = (level - 1) * 0.75;
        
        tocHtml += `
            <a href="#${id}" 
               class="block text-sm hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
               style="margin-left: ${indent}rem;"
               data-heading-id="${id}">
                ${text}
            </a>
        `;
    });
    tocHtml += '</nav>';
    
    return { toc: tocHtml, content: tempDiv.innerHTML };
}

function openModal(id) {
    const item = allNewsletters.find(n => n.id === id);
    if (!item) return;
    
    if (window.highlightedCard) {
        window.highlightedCard.classList.remove('card-highlighted');
        window.highlightedCard = null;
    }
    
    updateURLWithCard(id);
    pauseCurrentAudio();
    
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    const titleElement = document.getElementById('modal-title');
    const dateElement = document.getElementById('modal-date');
    const quoteElement = document.getElementById('modal-quote-container');
    const bodyElement = document.getElementById('modal-body-content');
    const faqDesktopElement = document.getElementById('modal-faq-content');
    const mobileSectionContent = document.getElementById('mobile-section-content');
    const videoElement = document.getElementById('modal-video-container');
    
    [bodyElement, faqDesktopElement, mobileSectionContent, videoElement].forEach(el => {
        if (el) {
            el.style.opacity = '0';
            el.innerHTML = '';
        }
    });
     if (quoteElement) {
        quoteElement.style.display = 'none';
        quoteElement.innerHTML = '';
    }
    
    if (titleElement) titleElement.textContent = item.title;
    if (dateElement) dateElement.textContent = item.dateInfo.displayDate;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    modal.offsetHeight;
    
    requestAnimationFrame(() => {
        modal.classList.add('flex');
    });
    
    modal.classList.remove('reading-mode');
    
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });

    window.currentNewsletterItem = item;

    setTimeout(() => {
        // 'item.citas' ahora es el "Cuerpo Principal (Markdown)"
        if (quoteElement && item.citas && item.citas.trim() !== '') {
            quoteElement.innerHTML = marked.parse(item.citas);
            quoteElement.style.display = 'block';
            quoteElement.style.opacity = '1';
            quoteElement.classList.add('content-fade-in');
        }

        if (bodyElement) {
            // 'item.body' ahora es el "Resumen"
            const bodyWithTitle = `### Resumen\n\n${item.body || '*No hay contenido disponible.*'}`;
            const processedBody = processMarkdownContent(bodyWithTitle);
            let htmlContent = marked.parse(processedBody);
            htmlContent = processExternalLinks(htmlContent);
            
            const tocData = generateTableOfContents(htmlContent);
            htmlContent = tocData.content;
            
            bodyElement.innerHTML = htmlContent;
            bodyElement.style.opacity = '1';
            bodyElement.classList.add('content-fade-in');
            
            window.currentTOC = tocData.toc;
        }
        
        const processedFaq = processMarkdownContent(item.faq || '*No hay preguntas frecuentes.*');
        let faqContent = marked.parse(processedFaq);
        faqContent = processExternalLinks(faqContent);
        if (faqDesktopElement) {
            faqDesktopElement.innerHTML = faqContent;
            faqDesktopElement.style.opacity = '1';
            faqDesktopElement.classList.add('content-fade-in');
        }
        
        if (mobileSectionContent) {
            const mobileSectionTitle = document.getElementById('mobile-section-title');
            mobileSectionContent.innerHTML = faqContent;
            mobileSectionContent.style.opacity = '1';
            mobileSectionContent.classList.add('content-fade-in');
            if (mobileSectionTitle) {
                mobileSectionTitle.textContent = 'Preguntas Frecuentes';
            }
        }
        
        if (videoElement) {
            videoElement.innerHTML = generateMediaEmbed(item.link, true);
            videoElement.style.opacity = '1';
            videoElement.classList.add('content-fade-in');
        }
    }, 200);
}


function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    const url = new URL(window.location);
    url.searchParams.delete('boletin');
    window.history.replaceState({}, '', url);
    
    modal.classList.remove('flex');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        window.currentNewsletterItem = null;
        window.currentTOC = null;
    }, 400);
}

function scrollToHeading(headingId) {
    const heading = document.getElementById(headingId);
    if (heading) {
        const scrollContainer = heading.closest('.overflow-y-auto');
        
        if (scrollContainer) {
            const headerHeight = document.querySelector('#modal .sticky').offsetHeight || 80;
            const elementPosition = heading.offsetTop;
            const offsetPosition = elementPosition - headerHeight - 40;
            
            scrollContainer.scrollTo({
                top: Math.max(0, offsetPosition),
                behavior: 'smooth'
            });
        }
        
        heading.style.background = 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, transparent 50%)';
        heading.style.paddingLeft = '1rem';
        heading.style.marginLeft = '-1rem';
        heading.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            heading.style.background = '';
            heading.style.paddingLeft = '';
            heading.style.marginLeft = '';
        }, 2000);
    }
}

function showTableOfContents() {
    const faqDesktopElement = document.getElementById('modal-faq-content');
    const sidebarTitle = document.querySelector('#modal-sidebar h3');
    const mobileSectionContent = document.getElementById('mobile-section-content');
    const mobileSectionTitle = document.getElementById('mobile-section-title');
    
    if (window.currentTOC) {
        if (faqDesktopElement) faqDesktopElement.innerHTML = window.currentTOC;
        if (sidebarTitle) sidebarTitle.textContent = 'Índice de Contenido';
        if (mobileSectionContent) mobileSectionContent.innerHTML = window.currentTOC;
        if (mobileSectionTitle) mobileSectionTitle.textContent = 'Índice de Contenido';
    }
}

function showFAQ() {
    const faqDesktopElement = document.getElementById('modal-faq-content');
    const sidebarTitle = document.querySelector('#modal-sidebar h3');
    const mobileSectionContent = document.getElementById('mobile-section-content');
    const mobileSectionTitle = document.getElementById('mobile-section-title');
    
    if (window.currentNewsletterItem) {
        const processedFaq = processMarkdownContent(window.currentNewsletterItem.faq || '*No hay preguntas frecuentes.*');
        let faqContent = marked.parse(processedFaq);
        faqContent = processExternalLinks(faqContent);
        
        if (faqDesktopElement) faqDesktopElement.innerHTML = faqContent;
        if (sidebarTitle) sidebarTitle.textContent = 'Preguntas Frecuentes';
        if (mobileSectionContent) mobileSectionContent.innerHTML = faqContent;
        if (mobileSectionTitle) mobileSectionTitle.textContent = 'Preguntas Frecuentes';
    }
}

function showLoader(show) { 
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none'; 
    }
}

function showError(message) {
    const newsletterGrid = document.getElementById('newsletter-grid');
    if (newsletterGrid) {
        newsletterGrid.innerHTML = `<div class="col-span-full text-center p-8 bg-red-800/20 text-red-500 dark:text-red-400 rounded-lg">${message}</div>`;
    }
    showLoader(false);
}

function parseIdToDateInfo(idString) {
    if (!idString || typeof idString !== 'string') {
        return { startDate: null, endDate: null, displayDate: 'Fecha no disponible', weekNumber: null };
    }
    const parts = idString.split('_');
    if (parts.length < 3) return { startDate: null, endDate: null, displayDate: idString, weekNumber: null };
    
    const yearWeekPart = parts[0];
    const yearWeekMatch = yearWeekPart.match(/^(\d{4})-(\d+)$/);
    const weekNumber = yearWeekMatch ? parseInt(yearWeekMatch[2], 10) : null;
    
    const startDate = new Date(parts[1]);
    const endDate = new Date(parts[2]);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { startDate: null, endDate: null, displayDate: 'Fecha inválida', weekNumber };
    }

    const startDay = startDate.toLocaleDateString('es-ES', { day: 'numeric' });
    const startMonth = startDate.toLocaleDateString('es-ES', { month: 'long' });
    const endDay = endDate.toLocaleDateString('es-ES', { day: 'numeric' });
    const endMonth = endDate.toLocaleDateString('es-ES', { month: 'long' });
    const year = endDate.getFullYear();

    const weekText = weekNumber ? `Semana ${weekNumber}` : '';

    let dateRangeText;
    if (startMonth === endMonth) {
        dateRangeText = `del ${startDay} al ${endDay} de ${endMonth} de ${year}`;
    } else {
        dateRangeText = `del ${startDay} de ${startMonth} al ${endDay} de ${endMonth} de ${year}`;
    }
    
    const displayDate = weekText ? `${weekText}: ${dateRangeText}` : dateRangeText;
    
    return { startDate, endDate, displayDate, weekNumber };
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekDates(weekNumber, year) {
    const firstDay = new Date(year, 0, 1);
    const firstThursday = new Date(year, 0, 1 + (4 - firstDay.getDay() + 7) % 7);
    const firstWeekStart = new Date(firstThursday);
    firstWeekStart.setDate(firstThursday.getDate() - 3);
    
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return { start: weekStart, end: weekEnd };
}

function formatWeekDisplay(weekNumber, year) {
    const { start, end } = getWeekDates(weekNumber, year);
    
    const startDay = start.getDate();
    const startMonth = start.toLocaleDateString('es-ES', { month: 'long' });
    const endDay = end.getDate();
    const endMonth = end.toLocaleDateString('es-ES', { month: 'long' });
    
    let dateRange;
    if (start.getMonth() === end.getMonth()) {
        dateRange = `del ${startDay} al ${endDay} de ${startMonth}`;
    } else {
        dateRange = `del ${startDay} de ${startMonth} al ${endDay} de ${endMonth}`;
    }
    
    return `Semana ${weekNumber} (${dateRange})`;
}

function getYouTubeID(url) {
    if(!url) return null;
    const regExp = /^.*(youtube\.com\/|youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function generateMediaEmbed(link, fullSize = false) {
    if (!link) return '';
    
    const youtubeId = getYouTubeID(link);
    if (youtubeId) {
        if (fullSize) {
            return `<div class="relative w-full max-w-4xl mx-auto mb-8"><div class="relative pb-[56.25%] h-0"><iframe class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg" src="https://www.youtube.com/embed/${youtubeId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
        } else {
            return `<iframe width="100%" height="95" class="rounded-md" src="https://www.youtube.com/embed/${youtubeId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
    }
    
    if (link.match(/\.(mp3|wav|ogg|m4a)$/i) || link.includes('archive.org')) {
        const audioElement = createAudioPlayer(link, fullSize);
        return fullSize ? `<div class="w-full max-w-2xl mx-auto mb-8">${audioElement}</div>` : audioElement;
    }

    if (link.includes('ivoox.com')) {
        const embedLink = link.replace('_sq_f1', '_ep_1');
        return fullSize
            ? `<div class="w-full max-w-2xl mx-auto mb-8"><iframe width="100%" height="200" scrolling="no" frameborder="0" allowfullscreen="" src="${embedLink}" class="rounded-lg shadow-lg"></iframe></div>`
            : `<iframe width="100%" height="200" scrolling="no" frameborder="0" allowfullscreen="" src="${embedLink}"></iframe>`;
    }

    return '';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('tag')) {
            event.stopPropagation();
            toggleKeywordFilter(event.target.textContent);
        }
        if (event.target.classList.contains('read-more-btn')) {
            openModal(event.target.dataset.id);
        }
        if (event.target.classList.contains('expand-keywords')) {
            event.stopPropagation();
            expandCardKeywords(event.target.dataset.cardId);
        }
        if (event.target.classList.contains('collapse-keywords')) {
            event.stopPropagation();
            collapseCardKeywords(event.target.dataset.cardId);
        }
        if (event.target.dataset.headingId) {
            event.preventDefault();
            scrollToHeading(event.target.dataset.headingId);
        }
        if (event.target.closest('.share-btn')) {
            event.stopPropagation();
            const shareBtn = event.target.closest('.share-btn');
            const cardId = shareBtn.dataset.shareId;
            if (cardId) {
                const url = new URL(window.location);
                url.searchParams.set('boletin', cardId);
                copyToClipboard(url.toString(), '🔗 Enlace directo copiado al portapapeles');
            }
        }
    });

    const yearSelector = document.getElementById('year-selector');
    const searchInput = document.getElementById('search-input');
    const monthFilter = document.getElementById('month-filter');
    const weekFilter = document.getElementById('week-filter');
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-close');
    const navContent = document.getElementById('nav-content');
    const navFaq = document.getElementById('nav-faq');
    const toggleReadingModeBtn = document.getElementById('toggle-reading-mode');
    const modalShare = document.getElementById('modal-share');

    if(yearSelector) {
        yearSelector.addEventListener('change', (e) => loadAndProcessData(e.target.value));
    }
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (monthFilter) monthFilter.addEventListener('change', applyFilters);
    if (weekFilter) weekFilter.addEventListener('change', applyFilters);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
    document.addEventListener('keydown', (e) => { 
        if (e.key === "Escape" && modal && !modal.classList.contains('hidden')) closeModal(); 
    });

    if (modalShare) modalShare.addEventListener('click', () => {
        copyToClipboard(window.location.href, '🔗 Enlace del boletín copiado al portapapeles');
    });

    if (navContent) navContent.addEventListener('click', () => {
        showTableOfContents();
        const isDesktop = window.innerWidth >= 1024;
        const targetElement = isDesktop ? document.getElementById('modal-body-content') : document.getElementById('mobile-content-section');
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    if (navFaq) navFaq.addEventListener('click', () => {
        showFAQ();
        if (window.innerWidth < 1024) {
            const element = document.getElementById('mobile-content-section');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
    if (toggleReadingModeBtn) toggleReadingModeBtn.addEventListener('click', () => {
        modal.classList.toggle('reading-mode');
    });

    window.scrollToHeading = scrollToHeading;

    // --- Start the application ---
    init();
});
