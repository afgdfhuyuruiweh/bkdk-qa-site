// --- CONFIG & GLOBAL STATE ---
let activeTab = 'inbox'; // inbox, answers, settings
let activePublicTab = 'answers'; // answers, posts
let activeAskMode = 'ask-question'; // ask-question, write-post
let activeQuoteItem = null;
let tempAvatarBase64 = null;
let tempHeaderBase64 = null;
let activeColorScheme = localStorage.getItem("bkdk_scheme") || "dark";
document.documentElement.setAttribute('data-scheme', activeColorScheme);

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='bkdk-grad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2300ffcc'/><stop offset='100%' stop-color='%23ff5e00'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(%23bkdk-grad)'/><text x='50' y='65' font-size='42' text-anchor='middle'>💥</text></svg>";
const DEFAULT_HEADER = "default";

// --- UTILITY: RENDER CONSISTENT IOS EMOJIS VIA TWEMOJI & APPLE EMOJI DATASOURCE ---
function applyIosEmojis(target) {
    if (typeof twemoji === 'undefined') return;
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    twemoji.parse(el, {
        callback: (iconId) => `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${iconId}.png`
    });
}

// Global capture-phase error listener for emoji images to handle variation selector mismatches (e.g., 2764.png vs 2764-fe0f.png)
window.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('emoji')) {
        const img = e.target;
        if (!img.getAttribute('data-fallback')) {
            img.setAttribute('data-fallback', 'true');
            const src = img.src;
            if (src.includes('-fe0f.png')) {
                img.src = src.replace('-fe0f.png', '.png');
            } else if (src.includes('.png')) {
                img.src = src.replace('.png', '-fe0f.png');
            }
        }
    }
}, true);

// --- UTILITY: VISITOR SESSION ID FOR LIKES ---
function getVisitorSessionId() {
    let visitorId = localStorage.getItem("bkdk_visitor_id");
    if (!visitorId) {
        visitorId = "visitor_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("bkdk_visitor_id", visitorId);
    }
    return visitorId;
}

// --- UTILITY: TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Create new toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const toastMsg = document.createElement('span');
    toastMsg.textContent = message;
    toast.appendChild(toastMsg);
    
    // Add custom twemoji icons if available
    const icon = document.createElement('span');
    icon.innerHTML = type === 'success' ? '💥' : (type === 'error' ? '⚡' : '✨');
    toast.insertBefore(icon, toastMsg);
    
    container.appendChild(toast);
    
    // Animate & remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.9)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- UTILITY: TIME FORMATTER ---
function getRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// --- UTILITY: APPLY HEADER BANNER ---
function applyHeaderBanner(element, headerVal) {
    if (!element) return;
    const val = headerVal || "default";
    if (val === 'default' || val === '') {
        element.style.backgroundImage = 'none';
        element.style.background = 'linear-gradient(90deg, var(--logo-color) 0%, var(--logo-accent) 100%)';
    } else if (val.startsWith('linear-gradient') || val.startsWith('radial-gradient') || val.startsWith('rgb') || val.startsWith('#')) {
        element.style.backgroundImage = 'none';
        element.style.background = val;
    } else {
        element.style.background = 'none';
        element.style.backgroundImage = `url(${val})`;
    }
}

// --- RENTRY CUSTOM SYNTAX PARSING ---
function parseUnderlines(text) {
    return text.replace(/!~([\s\S]*?)~!/g, (match, content) => {
        const parts = content.split(';');
        if (parts.length < 2) {
            return `<span style="text-decoration: underline;">${content.trim()}</span>`;
        }
        
        const textVal = parts[parts.length - 1].trim();
        const styles = parts.slice(0, parts.length - 1).map(p => p.trim());
        
        let color = 'currentColor';
        let style = 'solid';
        let type = 'underline';
        let thickness = '1px';
        
        styles.forEach(p => {
            if (/^\d+$/.test(p)) {
                thickness = p + 'px';
            } else if (['solid', 'double', 'dotted', 'dashed', 'wavy'].includes(p)) {
                style = p;
            } else if (['underline', 'line-through', 'overline', 'both'].includes(p)) {
                type = p === 'both' ? 'underline line-through' : p;
            } else if (p !== 'default' && p !== '') {
                color = p;
            }
        });
        
        return `<span style="text-decoration: ${type} ${style} ${color}; text-decoration-thickness: ${thickness};">${textVal}</span>`;
    });
}

function preprocessRentry(text) {
    if (!text) return '';
    let lines = text.split('\n');
    lines = lines.map(line => {
        // 1. Headers with centering: e.g. # -> text <-
        const headerCenterMatch = line.match(/^(\s*)(#+)\s*->\s*(.*?)\s*<-$/);
        if (headerCenterMatch) {
            return `${headerCenterMatch[1]}${headerCenterMatch[2]} <span class="md-center-inline">${headerCenterMatch[3]}</span>`;
        }
        
        // 2. Block centering with optional blockquote: e.g. > -> text <- or -> text <-
        const centerMatch = line.match(/^(\s*)(>?)\s*->\s*(.*?)\s*<-$/);
        if (centerMatch) {
            const prefix = centerMatch[2] ? `${centerMatch[2]} ` : '';
            return `${centerMatch[1]}${prefix}<div class="md-center">${centerMatch[3]}</div>`;
        }
        
        // 3. Block right alignment with optional blockquote: e.g. > -> text -> or -> text ->
        const rightMatch = line.match(/^(\s*)(>?)\s*->\s*(.*?)\s*->$/);
        if (rightMatch) {
            const prefix = rightMatch[2] ? `${rightMatch[2]} ` : '';
            return `${rightMatch[1]}${prefix}<div class="md-right">${rightMatch[3]}</div>`;
        }
        
        // Auto-embed direct image/GIF links if they are on a line by themselves
        const cleanLine = line.trim();
        const isUrl = cleanLine.startsWith('http://') || cleanLine.startsWith('https://');
        const hasImgExt = /\.(jpeg|jpg|gif|png|webp|svg)/i.test(cleanLine) || cleanLine.includes('tenor.com/view') || cleanLine.includes('giphy.com/media') || cleanLine.includes('media.giphy.com');
        if (isUrl && hasImgExt) {
            return `<div class="embedded-media" style="margin-top: 8px;"><img src="${cleanLine}" alt="Embedded Media" style="max-width: 100%; max-height: 350px; border-radius: 12px; border: 1px solid var(--glass-border); box-shadow: 0 4px 12px rgba(0,0,0,0.15); object-fit: contain; display: block;"></div>`;
        }
        
        return line;
    });
    
    let processed = lines.join('\n');
    
    // 4. Spoilers: !> text !>
    processed = processed.replace(/!>([\s\S]*?)!>/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    
    // 5. Colors: %#hex% text %% or %color% text %%
    processed = processed.replace(/%([#a-zA-Z0-9]+)%([\s\S]*?)%%/g, '<span style="color: $1;">$2</span>');
    
    // 6. Underlines
    processed = parseUnderlines(processed);
    
    return processed;
}

function renderMarkdown(text) {
    if (typeof marked === 'undefined') return text;
    const preprocessed = preprocessRentry(text);
    return marked.parse(preprocessed);
}

// --- DYNAMIC BACKGROUND PARTICLES CANVAS ---
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('canvas-particles');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.theme = document.documentElement.getAttribute('data-theme') || 'wonder-duo';
        
        // Listen to attribute changes on <html> tag to adjust particle colors live
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
                    this.theme = document.documentElement.getAttribute('data-theme');
                    this.particles = [];
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        const radius = Math.random() * 3 + 1;
        const x = Math.random() * this.canvas.width;
        const y = this.canvas.height + 10;
        const vx = (Math.random() - 0.5) * 0.8;
        const vy = -(Math.random() * 1.5 + 0.5);
        const maxLife = Math.random() * 150 + 100;
        
        let color = '#00ffb7'; // Wonder Duo Default (Teal)
        if (this.theme === 'dynamight') {
            color = Math.random() > 0.4 ? '#ff5e00' : '#ffc107'; // orange or gold
        } else if (this.theme === 'deku') {
            color = Math.random() > 0.3 ? '#00ffc4' : '#33ffd3'; // neon green or cyan
        } else if (this.theme === 'wonder-duo') {
            color = Math.random() > 0.5 ? '#00ffb7' : '#ff6a00'; // teal or orange split
        } else if (this.theme === 'fantasy-au') {
            color = Math.random() > 0.45 ? '#d4af37' : '#c62828'; // Gold or Crimson Red ambers
        } else if (this.theme === 'pro-heroes') {
            color = Math.random() > 0.45 ? '#00e676' : '#ff5500'; // Neon Bio Green or Cyber Orange tech sparks
        } else if (this.theme === 'winter-gear') {
            color = Math.random() > 0.7 ? '#ff6f00' : '#ffffff'; // Snowy white flakes or cozy warm orange ambers
        } else if (this.theme === 'ua-gym') {
            color = Math.random() > 0.5 ? '#ffffff' : '#a5b7d6'; // Sporty white dust or light athletic blue particles
        } else if (this.theme === 'origin-childhood') {
            color = Math.random() > 0.4 ? '#d4ff1a' : '#ff8f00'; // Forest bright yellow fireflies or gold sunset path sparks
        } else if (this.theme === 'vigilante') {
            color = Math.random() > 0.55 ? '#00e676' : '#c62828'; // Toxic neon green or blood crimson lighting sparks
        }

        return { x, y, radius, vx, vy, color, life: 0, maxLife, opacity: Math.random() * 0.7 + 0.3 };
    }

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Only generate particles if theme is not comic-grid
        if (this.theme !== 'comic-grid' && this.theme !== 'deku-comic-grid') {
            // Spawn new particles
            if (this.particles.length < 80 && Math.random() < 0.15) {
                this.particles.push(this.createParticle());
            }

            // Update and draw particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life++;
                
                const ratio = p.life / p.maxLife;
                const alpha = p.opacity * (1 - ratio);
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius * (1 - ratio * 0.3), 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                
                // Add soft glowing shadow
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = p.color;
                
                this.ctx.globalAlpha = alpha;
                this.ctx.fill();
                
                // Remove dead particles
                if (p.life >= p.maxLife || p.x < 0 || p.x > this.canvas.width) {
                    this.particles.splice(i, 1);
                }
            }
        }
        
        this.ctx.shadowBlur = 0; // Reset blur
        this.ctx.globalAlpha = 1.0;
        
        requestAnimationFrame(() => this.loop());
    }
}

// --- ROUTING MANAGER ---
function handleRouting() {
    const hash = window.location.hash || '#';
    
    // Hide all view screens
    document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
    
    const owner = db.getOwner();
    
    if (hash === '#dashboard') {
        if (!auth.currentUser) {
            // If trying to access dashboard but not logged in, trigger mock login
            auth.loginWithOwnerGoogle();
            return;
        }
        document.getElementById('dashboard-view').classList.add('active');
        renderDashboard();
    } else if (hash.startsWith('#u/')) {
        // Public profile view
        document.getElementById('profile-view').classList.add('active');
        renderPublicProfile(owner);
    } else {
        // Landing Page
        document.getElementById('landing-view').classList.add('active');
        if (owner) {
            const welcomeMsgEl = document.getElementById('landing-welcome-message');
            welcomeMsgEl.innerHTML = renderMarkdown(owner.landingBio || owner.bio);
            applyIosEmojis(welcomeMsgEl);
        }
    }
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('bkdk_db_sync', handleRouting);

// --- RENDERING PROFILE FEED ---
function renderPublicProfile(owner) {
    if (!owner) return;
    
    // Update theme
    document.documentElement.setAttribute('data-theme', owner.theme || 'wonder-duo');
    
    // Set text elements
    document.getElementById('pub-profile-avatar').src = owner.avatar || DEFAULT_AVATAR;
    document.getElementById('pub-profile-name').textContent = owner.displayName;
    applyHeaderBanner(document.getElementById('pub-profile-banner'), owner.header);
    document.getElementById('pub-profile-handle').textContent = `@${owner.handle}`;
    
    const sidebarBioEl = document.getElementById('pub-profile-sidebar-bio');
    sidebarBioEl.textContent = owner.sidebarBio || '';
    
    const websiteEl = document.getElementById('pub-profile-website');
    if (owner.website) {
        websiteEl.href = owner.website.startsWith('http') ? owner.website : `https://${owner.website}`;
        websiteEl.textContent = owner.website.replace(/https?:\/\/(www\.)?/, '');
        document.getElementById('pub-profile-link-row').style.display = 'flex';
    } else {
        document.getElementById('pub-profile-link-row').style.display = 'none';
    }
    
    // Show edit button if owner is logged in
    const editBtn = document.getElementById('btn-sidebar-edit');
    if (auth.currentUser && auth.currentUser.id === owner.id) {
        editBtn.style.display = 'flex';
    } else {
        editBtn.style.display = 'none';
    }
    
    // Setup Ask Box Mode Toggles and placeholders
    const askModesDiv = document.getElementById('ask-box-modes');
    const pubAskTitleEl = document.getElementById('pub-ask-title');
    const pubAskTextarea = document.getElementById('pub-ask-textarea');
    const btnSubmitQ = document.getElementById('btn-submit-question');
    const labelAnon = document.getElementById('label-ask-anon');
    const nameWrapper = document.getElementById('pub-ask-name-wrapper');
    const checkAnon = document.getElementById('checkbox-ask-anon');
    
    if (auth.currentUser && auth.currentUser.id === owner.id) {
        // Show Write Post vs Ask Question tabs for owner
        if (askModesDiv) askModesDiv.style.display = 'flex';
        
        const modeWritePostBtn = document.getElementById('mode-write-post');
        const modeAskQBtn = document.getElementById('mode-ask-question');
        
        if (activeAskMode === 'write-post') {
            if (modeWritePostBtn) {
                modeWritePostBtn.style.color = 'var(--accent-color)';
                modeWritePostBtn.style.fontWeight = '700';
            }
            if (modeAskQBtn) {
                modeAskQBtn.style.color = 'var(--text-secondary)';
                modeAskQBtn.style.fontWeight = '600';
            }
            
            if (pubAskTitleEl) pubAskTitleEl.textContent = "Write a Post 📝";
            if (pubAskTextarea) pubAskTextarea.placeholder = "Share an update with your followers...";
            if (btnSubmitQ) btnSubmitQ.textContent = "Post";
            if (labelAnon) labelAnon.style.display = 'none';
            if (nameWrapper) nameWrapper.style.display = 'none';
        } else {
            if (modeWritePostBtn) {
                modeWritePostBtn.style.color = 'var(--text-secondary)';
                modeWritePostBtn.style.fontWeight = '600';
            }
            if (modeAskQBtn) {
                modeAskQBtn.style.color = 'var(--accent-color)';
                modeAskQBtn.style.fontWeight = '700';
            }
            
            if (pubAskTitleEl) pubAskTitleEl.textContent = owner.askTitle || "Ask us anything! 💥⚡";
            if (pubAskTextarea) pubAskTextarea.placeholder = owner.askPlaceholder || "Type your question here...";
            if (btnSubmitQ) btnSubmitQ.textContent = "Ask";
            
            if (labelAnon) labelAnon.style.display = 'flex';
            if (nameWrapper) {
                nameWrapper.style.display = (checkAnon && checkAnon.checked) ? 'none' : 'block';
            }
        }
    } else {
        // Standard public ask box display for visitors
        if (askModesDiv) askModesDiv.style.display = 'none';
        activeAskMode = 'ask-question'; // Fallback
        
        if (pubAskTitleEl) pubAskTitleEl.textContent = owner.askTitle || "Ask us anything! 💥⚡";
        if (pubAskTextarea) pubAskTextarea.placeholder = owner.askPlaceholder || "Type your question here...";
        if (btnSubmitQ) btnSubmitQ.textContent = "Ask";
        
        if (labelAnon) labelAnon.style.display = 'flex';
        if (nameWrapper) {
            nameWrapper.style.display = (checkAnon && checkAnon.checked) ? 'none' : 'block';
        }
    }
    applyIosEmojis('pub-ask-title');
    
    // Social links box
    const socialsCard = document.getElementById('pub-socials-card');
    const socialsContainer = document.getElementById('pub-socials-container');
    socialsContainer.innerHTML = '';
    let hasSocials = false;
    
    const socialConfigs = [
        { key: 'twitter', label: 'X / Twitter', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`, url: (val) => `https://x.com/${val}` },
        { key: 'tiktok', label: 'TikTok', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.02.02.04.04.06.06V8.2c-.75-.12-1.48-.38-2.16-.76-.71-.4-1.32-.96-1.77-1.63V15.5c0 .7-.13 1.4-.39 2.06-.5 1.3-1.47 2.4-2.73 3.08-1.57.85-3.5.95-5.15.26C4.24 20.21 2.8 18.5 2.2 16.63c-.88-2.68.04-5.7 2.27-7.4 1.48-1.13 3.39-1.58 5.24-1.24V12.1c-1.14-.38-2.42-.11-3.32.7-.93.83-1.28 2.16-.9 3.34.34 1.08 1.3 1.9 2.4 2.1 1.45.27 2.96-.54 3.4-1.93.13-.42.19-.86.19-1.3V.02z"/></svg>`, url: (val) => `https://tiktok.com/@${val}` },
        { key: 'ao3', label: 'AO3', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`, url: (val) => `https://archiveofourown.org/users/${val}` }
    ];
    
    socialConfigs.forEach(cfg => {
        if (owner[cfg.key]) {
            hasSocials = true;
            const a = document.createElement('a');
            a.className = 'btn-secondary btn-sm';
            a.style.justifyContent = 'flex-start';
            a.style.width = '100%';
            a.href = cfg.url(owner[cfg.key]);
            a.target = '_blank';
            a.innerHTML = `${cfg.icon} <span>${cfg.label}: @${owner[cfg.key]}</span>`;
            socialsContainer.appendChild(a);
        }
    });
    
    socialsCard.style.display = hasSocials ? 'block' : 'none';
    
    // Title/Bio Slogan Card
    document.getElementById('pub-profile-slogan').innerHTML = renderMarkdown(owner.bio);
    applyIosEmojis('pub-profile-slogan');
    
    // Render active quote preview if any
    const quoteContainer = document.getElementById('quote-preview-container');
    if (quoteContainer) {
        if (activeQuoteItem) {
            quoteContainer.style.display = 'block';
            quoteContainer.innerHTML = `
                <div class="glass-panel" style="background: var(--accent-soft); border-left: 4px solid var(--accent-color); padding: 10px 14px; border-radius: 10px; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center; text-align: left; margin-bottom: 12px;">
                    <div style="min-width: 0;">
                        <span style="font-weight: 700; color: var(--text-primary); display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Quoting:</span>
                        <span style="color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block; max-width: 320px;">
                            "${activeQuoteItem.answer || activeQuoteItem.text}"
                        </span>
                    </div>
                    <button id="btn-clear-quote" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary); font-weight: 700; padding: 0 4px; line-height: 1;">&times;</button>
                </div>
            `;
            document.getElementById('btn-clear-quote').onclick = () => {
                activeQuoteItem = null;
                renderPublicProfile(db.getOwner());
            };
        } else {
            quoteContainer.style.display = 'none';
            quoteContainer.innerHTML = '';
        }
    }
    
    // Render tabs contents
    const questions = db.getPublicQA();
    const answers = questions.filter(q => !q.isPost);
    const posts = questions.filter(q => q.isPost);
    
    document.getElementById('tab-badge-answers').textContent = answers.length;
    document.getElementById('tab-badge-posts').textContent = posts.length;
    
    const feedContainer = document.getElementById('pub-answered-container');
    feedContainer.innerHTML = '';
    
    const activeList = activePublicTab === 'answers' ? answers : posts;
    
    if (activeList.length === 0) {
        feedContainer.innerHTML = `
            <div class="glass-panel" style="padding: 30px; text-align: center; color: var(--text-secondary);">
                <p>No ${activePublicTab} found. 💥</p>
            </div>
        `;
        return;
    }
    
    activeList.forEach(q => {
        const card = document.createElement('div');
        card.className = `qa-card glass-panel ${q.isPost ? 'is-post' : 'is-question'}`;
        card.id = `qa-card-public-${q.id}`;
        card.style.position = 'relative';
        
        const showDeleteOption = auth.currentUser && auth.currentUser.id === owner.id;
        
        const dropdownHtml = `
            <div class="card-options-dropdown">
                <button class="dropdown-trigger-btn" onclick="toggleCardDropdown(event, '${q.id}')" title="Options">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                        <circle cx="12" cy="5" r="1.5"></circle>
                        <circle cx="12" cy="12" r="1.5"></circle>
                        <circle cx="12" cy="19" r="1.5"></circle>
                    </svg>
                </button>
                <div class="dropdown-menu" id="dropdown-menu-${q.id}">
                    <button class="dropdown-item" onclick="shareItem('${q.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        <span>Share Q&A</span>
                    </button>
                    ${showDeleteOption ? `
                        <button class="dropdown-item" onclick="togglePinPublicQuestion('${q.id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H7M15 9H9"></path></svg>
                            <span>${q.pinned ? 'Unpin Feed' : 'Pin to Top'}</span>
                        </button>
                        <button class="dropdown-item delete" onclick="deletePublicQuestion('${q.id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Delete</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        const pinnedBadge = q.pinned ? `
            <div class="pinned-badge" style="display: inline-flex; align-items: center; gap: 6px; color: var(--accent-color); font-weight: 800; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2v20M17 5H7M15 9H9"></path></svg>
                <span>Pinned</span>
            </div>
        ` : '';
        
        let questionHtml = '';
        if (!q.isPost) {
            questionHtml = `
                <div class="qa-card-question">
                    <div class="qa-question-header">
                        <span>Asked by ${q.senderName || 'Anonymous'}</span>
                        <span>${getRelativeTime(q.createdAt)}</span>
                    </div>
                    <div class="qa-question-text">${q.text}</div>
                </div>
            `;
        }
        
        let quoteHtml = '';
        if (q.parentQuestionId) {
            const parentQ = db.getQuestions().find(item => item.id === q.parentQuestionId);
            if (parentQ) {
                const parentIsPost = parentQ.isPost || !parentQ.text;
                const quoteText = parentIsPost ? parentQ.answer : `Q: ${parentQ.text} — A: ${parentQ.answer}`;
                quoteHtml = `
                    <div class="quoted-card" onclick="jumpToPublicItem('${parentQ.id}')">
                        <div style="font-weight: 700; color: var(--text-secondary); font-size: 0.72rem; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            <span>Quoting @${owner.handle}</span>
                        </div>
                        <div style="color: var(--text-primary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 500;">
                            ${quoteText}
                        </div>
                    </div>
                `;
            }
        }
        
        const likes = q.likes || [];
        const visitorId = getVisitorSessionId();
        const isLiked = likes.includes(visitorId);
        
        const comments = q.comments || [];
        
        // Render comments list
        let commentsListHtml = '';
        if (comments.length > 0) {
            commentsListHtml = `
                <div class="comments-section">
                    ${comments.map(c => `
                        <div class="comment-row">
                            <div class="comment-header">
                                <span>${c.senderName}</span>
                                <span>${getRelativeTime(c.createdAt)}</span>
                            </div>
                            <div class="comment-text">${c.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        card.innerHTML = `
            ${dropdownHtml}
            ${pinnedBadge}
            ${questionHtml}
            ${quoteHtml}
            <div class="qa-card-answer">
                <img src="${owner.avatar}" alt="Avatar" class="qa-answer-avatar">
                <div class="qa-answer-main">
                    <div class="qa-answer-header">
                        <span class="qa-answerer-name">${owner.displayName}</span>
                        <span class="qa-answer-time">${getRelativeTime(q.answeredAt)}</span>
                    </div>
                    <div class="qa-answer-text">${renderMarkdown(q.answer)}</div>
                </div>
            </div>
            
            <div class="qa-card-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${q.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>${likes.length}</span>
                </button>
                <button class="action-btn" onclick="toggleCommentsForm('${q.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>Comments (${comments.length})</span>
                </button>
                <button class="action-btn" onclick="quoteItem('${q.id}')" title="Quote this Q&A / Post">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    <span>Quote</span>
                </button>
                <button class="action-btn" style="margin-left: auto;" onclick="shareItem('${q.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                    <span>Share</span>
                </button>
            </div>
            
            <div class="comment-input-panel" id="comments-panel-${q.id}" style="display: none; border-top: 1px solid var(--glass-border); padding-top: 12px; margin-top: 4px;">
                <div class="comment-input-row">
                    <input type="text" id="comment-name-${q.id}" class="input-field" placeholder="Your name (optional)" style="margin-bottom: 0; max-width: 150px; font-size: 0.85rem; padding: 6px 12px; height: 34px;">
                    <input type="text" id="comment-text-${q.id}" class="input-field" placeholder="Add a comment..." style="margin-bottom: 0; font-size: 0.85rem; padding: 6px 12px; height: 34px;">
                    <button class="btn-primary btn-sm" style="height: 34px; border-radius: 12px; padding: 0 16px;" onclick="submitComment('${q.id}')">Post</button>
                </div>
                ${commentsListHtml}
            </div>
        `;
        
        feedContainer.appendChild(card);
        applyIosEmojis(card);
    });
}

// --- OWNER DASHBOARD VIEW RENDERING ---
function renderDashboard() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Update active tab styles
    document.querySelectorAll('.sidebar-menu button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.dash-content-section').forEach(sec => sec.classList.remove('active'));
    
    if (activeTab === 'inbox') {
        document.getElementById('btn-dash-inbox').classList.add('active');
        document.getElementById('dash-section-inbox').classList.add('active');
        renderInbox();
    } else if (activeTab === 'answers') {
        document.getElementById('btn-dash-answers').classList.add('active');
        document.getElementById('dash-section-answers').classList.add('active');
        renderMyAnswers();
    } else if (activeTab === 'settings') {
        document.getElementById('btn-dash-settings').classList.add('active');
        document.getElementById('dash-section-settings').classList.add('active');
        populateSettings(user);
    }
    
    // Stats count updates
    const questions = db.getQuestions();
    const answeredCount = questions.filter(q => q.answer !== null && !q.isPost).length;
    const postsCount = questions.filter(q => q.isPost).length;
    
    document.getElementById('dash-stat-answers').textContent = answeredCount;
    document.getElementById('dash-stat-posts').textContent = postsCount;
    
    const inboxQ = db.getInboxQuestions();
    const badge = document.getElementById('badge-inbox-count');
    badge.textContent = inboxQ.length;
    badge.style.display = inboxQ.length > 0 ? 'inline-block' : 'none';
}

function renderInbox() {
    const container = document.getElementById('inbox-questions-container');
    const questions = db.getInboxQuestions();
    
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <p style="font-size: 1.1rem; margin-bottom: 8px;">🎉 Hooray! Your inbox is clean.</p>
                <p style="font-size: 0.9rem;">Copy your profile link to receive more questions!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    const owner = db.getOwner();
    questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'qa-card glass-panel';
        card.style.position = 'relative';
        
        let quoteHtml = '';
        if (q.parentQuestionId) {
            const parentQ = db.getQuestions().find(item => item.id === q.parentQuestionId);
            if (parentQ) {
                const parentIsPost = parentQ.isPost || !parentQ.text;
                const quoteText = parentIsPost ? parentQ.answer : `Q: ${parentQ.text} — A: ${parentQ.answer}`;
                quoteHtml = `
                    <div class="quoted-card" onclick="jumpToPublicItem('${parentQ.id}')" style="margin-bottom: 12px; margin-top: 4px;">
                        <div style="font-weight: 700; color: var(--text-secondary); font-size: 0.72rem; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            <span>Quoting @${owner.handle}</span>
                        </div>
                        <div style="color: var(--text-primary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 500;">
                            ${quoteText}
                        </div>
                    </div>
                `;
            }
        }
        
        card.innerHTML = `
            <div class="inbox-card-text">${q.text}</div>
            ${quoteHtml}
            <div class="inbox-card-meta">Received ${getRelativeTime(q.createdAt)} from ${q.senderName || 'Anonymous'}</div>
            
            <div class="inbox-actions">
                <button class="btn-primary btn-sm" onclick="toggleReplyBox('${q.id}')">Answer</button>
                <button class="btn-secondary btn-sm" style="border-color: #d9383a; color: #d9383a;" onclick="deleteQuestion('${q.id}')">Delete</button>
            </div>
            
            <div class="answer-textarea-panel" id="reply-box-${q.id}" style="display: none;">
                <textarea id="textarea-reply-${q.id}" class="input-field" placeholder="Write your reply..." style="min-height: 100px; resize: vertical;"></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn-secondary btn-sm" onclick="toggleReplyBox('${q.id}')">Cancel</button>
                    <button class="btn-primary btn-sm" onclick="submitAnswer('${q.id}')">Publish Answer</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderMyAnswers() {
    const container = document.getElementById('answered-questions-container');
    const questions = db.getPublicQA();
    
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="glass-panel" style="padding: 30px; text-align: center; color: var(--text-secondary);">
                <p>You haven't answered any questions or posted anything yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    const owner = db.getOwner();
    questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'qa-card glass-panel';
        card.style.position = 'relative';
        
        let quoteHtml = '';
        if (q.parentQuestionId) {
            const parentQ = db.getQuestions().find(item => item.id === q.parentQuestionId);
            if (parentQ) {
                const parentIsPost = parentQ.isPost || !parentQ.text;
                const quoteText = parentIsPost ? parentQ.answer : `Q: ${parentQ.text} — A: ${parentQ.answer}`;
                quoteHtml = `
                    <div class="quoted-card" onclick="jumpToPublicItem('${parentQ.id}')" style="margin-bottom: 12px; margin-top: 8px;">
                        <div style="font-weight: 700; color: var(--text-secondary); font-size: 0.72rem; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            <span>Quoting @${owner.handle}</span>
                        </div>
                        <div style="color: var(--text-primary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 500;">
                            ${quoteText}
                        </div>
                    </div>
                `;
            }
        }
        
        let headerText = q.isPost ? 'Standalone Post' : `Q: ${q.text}`;
        
        card.innerHTML = `
            <div class="inbox-card-text" style="border-bottom: 1px solid var(--glass-border); padding-bottom: 8px; font-size: 0.95rem; color: var(--text-secondary);">${headerText}</div>
            ${quoteHtml}
            <div style="font-size: 1.05rem; white-space: pre-wrap; font-weight: 500;">${q.answer}</div>
            <div class="inbox-card-meta">Published ${getRelativeTime(q.answeredAt)}</div>
            
            <div class="inbox-actions">
                <button class="btn-secondary btn-sm" onclick="toggleEditBox('${q.id}')">Edit</button>
                <button class="btn-secondary btn-sm" style="border-color: #d9383a; color: #d9383a;" onclick="deleteQuestion('${q.id}')">Delete</button>
            </div>
            
            <div class="answer-textarea-panel" id="edit-box-${q.id}" style="display: none;">
                <textarea id="textarea-edit-${q.id}" class="input-field" style="min-height: 100px; resize: vertical;">${q.answer}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn-secondary btn-sm" onclick="toggleEditBox('${q.id}')">Cancel</button>
                    <button class="btn-primary btn-sm" onclick="saveEditedAnswer('${q.id}')">Save Changes</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function populateSettings(user) {
    tempAvatarBase64 = null;
    tempHeaderBase64 = null;
    document.getElementById('edit-display-name').value = user.displayName || '';
    document.getElementById('edit-handle').value = user.handle || '';
    document.getElementById('preview-avatar-img').src = user.avatar || DEFAULT_AVATAR;
    applyHeaderBanner(document.getElementById('preview-header-img'), user.header);
    document.getElementById('edit-slogan').value = user.landingBio || '';
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-sidebar-bio').value = user.sidebarBio || '';
    document.getElementById('edit-ask-title').value = user.askTitle || '';
    document.getElementById('edit-ask-placeholder').value = user.askPlaceholder || '';
    document.getElementById('edit-website').value = user.website || '';
    document.getElementById('edit-twitter').value = user.twitter || '';
    document.getElementById('edit-tiktok').value = user.tiktok || '';
    document.getElementById('edit-ao3').value = user.ao3 || '';
    document.getElementById('edit-admin-email').value = user.adminEmail || '';
    const adminPwdInput = document.getElementById('edit-admin-password');
    if (adminPwdInput) {
        adminPwdInput.value = user.adminPassword || '';
    }
    
    // Themes active card
    document.querySelectorAll('.theme-card').forEach(card => {
        if (card.dataset.themeId === user.theme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// --- INTERACTIVE METHODS OVERRIDES ---

window.toggleReplyBox = function(id) {
    const box = document.getElementById(`reply-box-${id}`);
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
};

window.toggleEditBox = function(id) {
    const box = document.getElementById(`edit-box-${id}`);
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
};

window.submitAnswer = function(id) {
    const textarea = document.getElementById(`textarea-reply-${id}`);
    const text = textarea.value.trim();
    if (!text) {
        showToast("Answer content cannot be empty", "error");
        return;
    }
    
    db.answerQuestion(id, text);
    showToast("Answer published successfully!", "success");
    renderDashboard();
};

window.saveEditedAnswer = function(id) {
    const textarea = document.getElementById(`textarea-edit-${id}`);
    const text = textarea.value.trim();
    if (!text) {
        showToast("Answer content cannot be empty", "error");
        return;
    }
    
    db.answerQuestion(id, text);
    showToast("Answer updated successfully!", "success");
    renderDashboard();
};

window.deleteQuestion = function(id) {
    if (confirm("Are you sure you want to delete this question? This action is permanent.")) {
        db.deleteQuestion(id);
        showToast("Question deleted", "info");
        renderDashboard();
    }
};

window.toggleLike = function(id) {
    const visitorId = getVisitorSessionId();
    db.likeAnswer(id, visitorId);
    
    // Re-render public profile to show immediate count changes
    const owner = db.getOwner();
    renderPublicProfile(owner);
};

window.toggleCommentsForm = function(id) {
    const panel = document.getElementById(`comments-panel-${id}`);
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

window.submitComment = function(id) {
    const nameInput = document.getElementById(`comment-name-${id}`);
    const textInput = document.getElementById(`comment-text-${id}`);
    
    const name = nameInput.value.trim() || 'Anonymous';
    const text = textInput.value.trim();
    
    if (!text) {
        showToast("Comment cannot be empty", "error");
        return;
    }
    
    db.addComment(id, text, name);
    textInput.value = '';
    showToast("Comment posted!", "success");
    
    // Re-render
    const owner = db.getOwner();
    renderPublicProfile(owner);
    
    // Keep comments panel open
    document.getElementById(`comments-panel-${id}`).style.display = 'block';
};

// --- AUTH UI HANDLERS ---
function updateNavbarAuth(user) {
    const container = document.getElementById('nav-auth-container');
    if (user) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <button class="btn-secondary btn-sm" id="btn-goto-dash" style="padding: 6px 14px;">Dashboard</button>
                <button class="btn-secondary btn-sm" id="btn-logout" style="padding: 6px 14px; border-color: #d9383a; color: #d9383a;">Sign Out</button>
            </div>
        `;
        document.getElementById('btn-goto-dash').addEventListener('click', () => {
            window.location.hash = '#dashboard';
        });
        document.getElementById('btn-logout').addEventListener('click', () => {
            auth.logout();
            showToast("Signed out successfully", "info");
            window.location.hash = '#';
        });
    } else {
        container.innerHTML = `
            <button class="btn-primary btn-sm" id="btn-login-trigger">
                <span>sign in as mod</span>
            </button>
        `;
        document.getElementById('btn-login-trigger').addEventListener('click', () => {
            window.openLoginModal();
        });
    }
}

// --- EVENT LISTENERS BINDING ---
function setupEventListeners() {
    // Auth Listener
    auth.onAuthStateChanged((user) => {
        updateNavbarAuth(user);
        if (user) {
            // Apply owner theme
            document.documentElement.setAttribute('data-theme', user.theme || 'wonder-duo');
            populateSettings(user);
            
            // Request desktop notification permission for the mod
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
        } else {
            // Default visitor theme
            const owner = db.getOwner();
            document.documentElement.setAttribute('data-theme', owner.theme || 'wonder-duo');
        }
        handleRouting();
    });

    // Landing Page login button
    document.getElementById('btn-landing-login').addEventListener('click', () => {
        window.openLoginModal();
    });

    // Owner footer login
    document.getElementById('owner-footer-login').addEventListener('click', (e) => {
        e.preventDefault();
        window.openLoginModal();
    });

    // Dashboard tabs
    document.getElementById('btn-dash-inbox').addEventListener('click', () => {
        activeTab = 'inbox';
        renderDashboard();
    });
    document.getElementById('btn-dash-answers').addEventListener('click', () => {
        activeTab = 'answers';
        renderDashboard();
    });
    document.getElementById('btn-dash-settings').addEventListener('click', () => {
        activeTab = 'settings';
        renderDashboard();
    });

    // File Chooser Uploader Listeners
    document.getElementById('settings-avatar-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                tempAvatarBase64 = event.target.result;
                document.getElementById('preview-avatar-img').src = tempAvatarBase64;
                showToast("Avatar image loaded!", "success");
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('btn-reset-avatar').addEventListener('click', () => {
        tempAvatarBase64 = DEFAULT_AVATAR;
        document.getElementById('preview-avatar-img').src = DEFAULT_AVATAR;
        showToast("Avatar reset to default!", "info");
    });

    document.getElementById('settings-header-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                tempHeaderBase64 = event.target.result;
                applyHeaderBanner(document.getElementById('preview-header-img'), tempHeaderBase64);
                showToast("Header banner image loaded!", "success");
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('btn-reset-header').addEventListener('click', () => {
        tempHeaderBase64 = DEFAULT_HEADER;
        applyHeaderBanner(document.getElementById('preview-header-img'), DEFAULT_HEADER);
        showToast("Header banner reset to default!", "info");
    });

    // Toggle Light/Dark Mode Button
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const toggleIcon = document.getElementById('theme-toggle-icon');
    
    function updateThemeToggleIcon(scheme) {
        if (!toggleIcon) return;
        if (scheme === 'dark') {
            toggleIcon.innerHTML = `<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 17a5 5 0 100-10 5 5 0 000 10z"></path>`;
            if (btnThemeToggle) btnThemeToggle.title = "Switch to Light Mode";
        } else {
            toggleIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
            if (btnThemeToggle) btnThemeToggle.title = "Switch to Dark Mode";
        }
    }
    
    updateThemeToggleIcon(activeColorScheme);
    
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            activeColorScheme = activeColorScheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem("bkdk_scheme", activeColorScheme);
            document.documentElement.setAttribute('data-scheme', activeColorScheme);
            updateThemeToggleIcon(activeColorScheme);
            showToast(`Switched to ${activeColorScheme === 'dark' ? 'Dark' : 'Light'} Mode!`, "success");
        });
    }

    // Ask Box Mode Toggles
    const modeWritePostBtn = document.getElementById('mode-write-post');
    if (modeWritePostBtn) {
        modeWritePostBtn.addEventListener('click', () => {
            activeAskMode = 'write-post';
            const owner = db.getOwner();
            renderPublicProfile(owner);
        });
    }
    const modeAskQBtn = document.getElementById('mode-ask-question');
    if (modeAskQBtn) {
        modeAskQBtn.addEventListener('click', () => {
            activeAskMode = 'ask-question';
            const owner = db.getOwner();
            renderPublicProfile(owner);
        });
    }

    // Check Anon display toggle
    const checkAnonInput = document.getElementById('checkbox-ask-anon');
    if (checkAnonInput) {
        checkAnonInput.addEventListener('change', () => {
            const nameWrapper = document.getElementById('pub-ask-name-wrapper');
            if (nameWrapper) {
                nameWrapper.style.display = checkAnonInput.checked ? 'none' : 'block';
            }
        });
    }

    // Theme pickers inside settings
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Instantly apply theme preview so user can check colors!
            const selectedTheme = card.dataset.themeId;
            document.documentElement.setAttribute('data-theme', selectedTheme);
        });
    });

    // Save Settings
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const displayName = document.getElementById('edit-display-name').value.trim();
        const handle = document.getElementById('edit-handle').value.trim().toLowerCase().replace(/\s+/g, '');
        const landingBio = document.getElementById('edit-slogan').value.trim();
        const bio = document.getElementById('edit-bio').value.trim();
        const sidebarBio = document.getElementById('edit-sidebar-bio').value.trim();
        const askTitle = document.getElementById('edit-ask-title').value.trim();
        const askPlaceholder = document.getElementById('edit-ask-placeholder').value.trim();
        const website = document.getElementById('edit-website').value.trim();
        const twitter = document.getElementById('edit-twitter').value.trim();
        const tiktok = document.getElementById('edit-tiktok').value.trim();
        const ao3 = document.getElementById('edit-ao3').value.trim();
        const adminEmail = document.getElementById('edit-admin-email').value.trim();
        const adminPassword = document.getElementById('edit-admin-password').value;
        
        const currentOwner = db.getOwner();
        const avatar = tempAvatarBase64 !== null ? tempAvatarBase64 : currentOwner.avatar;
        const header = tempHeaderBase64 !== null ? tempHeaderBase64 : currentOwner.header;
        
        const activeThemeCard = document.querySelector('.theme-card.active');
        const theme = activeThemeCard ? activeThemeCard.dataset.themeId : 'wonder-duo';

        if (!displayName || !handle) {
            showToast("Name and handle slug are required", "error");
            return;
        }

        auth.updateOwnerProfile({
            displayName, handle, avatar, header, bio, landingBio, sidebarBio, website, twitter, tiktok, ao3, adminEmail, adminPassword, theme, askTitle, askPlaceholder
        });

        showToast("Settings saved successfully!", "success");
        renderDashboard();
    });

    // Submit Question / Create Post from Public/Owner profile
    document.getElementById('btn-submit-question').addEventListener('click', () => {
        const textarea = document.getElementById('pub-ask-textarea');
        const text = textarea.value.trim();
        if (!text) {
            showToast("Content cannot be empty", "error");
            return;
        }
        
        const quoteId = activeQuoteItem ? activeQuoteItem.id : null;
        
        // Check if owner is logged in and in write-post mode
        if (auth.currentUser && activeAskMode === 'write-post') {
            // Write standalone post
            db.createPost(text, quoteId);
            showToast("Post published to your feed!", "success");
        } else {
            // Ask question
            const nameInput = document.getElementById('pub-ask-name');
            const isAnonInput = document.getElementById('checkbox-ask-anon');
            const name = nameInput ? nameInput.value.trim() : '';
            const isAnon = isAnonInput ? isAnonInput.checked : true;
            
            db.askQuestion(text, name, isAnon, quoteId);
            if (auth.currentUser) {
                showToast("Question sent to your inbox!", "success");
            } else {
                showToast("Question sent anonymously to the mod's inbox!", "success");
            }
            if (nameInput) nameInput.value = '';
        }
        
        // Reset quote
        activeQuoteItem = null;
        
        textarea.value = '';
        const owner = db.getOwner();
        renderPublicProfile(owner);
    });

    // Switch between public profile tabs (Answers vs Posts)
    document.getElementById('tab-answers').addEventListener('click', () => {
        activePublicTab = 'answers';
        document.getElementById('tab-answers').classList.add('active');
        document.getElementById('tab-posts').classList.remove('active');
        
        const owner = db.getOwner();
        renderPublicProfile(owner);
    });
    
    document.getElementById('tab-posts').addEventListener('click', () => {
        activePublicTab = 'posts';
        document.getElementById('tab-posts').classList.add('active');
        document.getElementById('tab-answers').classList.remove('active');
        
        const owner = db.getOwner();
        renderPublicProfile(owner);
    });

    // Share Profile Sidebar Button
    const shareProfBtn = document.getElementById('btn-share-profile');
    if (shareProfBtn) {
        shareProfBtn.addEventListener('click', () => {
            window.shareProfile();
        });
    }

    // Close Share Modal handlers
    const closeShareModalBtn = document.getElementById('btn-close-share-modal');
    if (closeShareModalBtn) {
        closeShareModalBtn.addEventListener('click', () => {
            document.getElementById('share-modal').style.display = 'none';
        });
    }
    const shareModalEl = document.getElementById('share-modal');
    if (shareModalEl) {
        shareModalEl.addEventListener('click', (e) => {
            if (e.target === shareModalEl) {
                shareModalEl.style.display = 'none';
            }
        });
    }

    // Login Modal handlers
    const closeLoginModalBtn = document.getElementById('btn-close-login-modal');
    if (closeLoginModalBtn) {
        closeLoginModalBtn.addEventListener('click', () => {
            document.getElementById('login-modal').style.display = 'none';
        });
    }
    const loginModalEl = document.getElementById('login-modal');
    if (loginModalEl) {
        loginModalEl.addEventListener('click', (e) => {
            if (e.target === loginModalEl) {
                loginModalEl.style.display = 'none';
            }
        });
    }
    const btnLoginGoogle = document.getElementById('btn-login-google');
    if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', () => {
            auth.loginWithOwnerGoogle();
            document.getElementById('login-modal').style.display = 'none';
        });
    }
    const formLoginPassword = document.getElementById('form-login-password');
    if (formLoginPassword) {
        formLoginPassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email');
            const pwdInput = document.getElementById('login-password');
            const email = emailInput ? emailInput.value.trim() : '';
            const password = pwdInput ? pwdInput.value : '';
            
            try {
                await auth.loginWithPassword(email, password);
                showToast("Welcome back! Signed in successfully.", "success");
                document.getElementById('login-modal').style.display = 'none';
                if (emailInput) emailInput.value = '';
                if (pwdInput) pwdInput.value = '';
                window.location.hash = '#dashboard';
            } catch (err) {
                showToast(err.message || "Invalid credentials", "error");
            }
        });
    }
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    // Start background particle loop
    new ParticleSystem();
    
    // Bind listeners
    setupEventListeners();
    
    // Initial Routing
    handleRouting();
});

// --- SHARE & OPTIONS DROPDOWNS MANAGEMENT ---
window.toggleCardDropdown = function(event, id) {
    event.stopPropagation();
    
    // Close other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu.id !== `dropdown-menu-${id}`) {
            menu.classList.remove('active');
        }
    });
    
    const menu = document.getElementById(`dropdown-menu-${id}`);
    if (menu) {
        menu.classList.toggle('active');
    }
};

window.deletePublicQuestion = function(id) {
    if (confirm("Are you sure you want to delete this question/post? This action is permanent.")) {
        db.deleteQuestion(id);
        showToast("Deleted successfully", "info");
        // Re-render profile
        const owner = db.getOwner();
        renderPublicProfile(owner);
    }
};

window.togglePinPublicQuestion = function(id) {
    db.togglePinQuestion(id);
    const q = db.getQuestions().find(item => item.id === id);
    if (q) {
        showToast(q.pinned ? "Pinned to top!" : "Unpinned from top!", "success");
    }
    const owner = db.getOwner();
    renderPublicProfile(owner);
};

window.shareItem = function(id) {
    const q = db.getQuestions().find(item => item.id === id);
    if (q) {
        openShareModal('qa', q);
    }
};

window.shareProfile = function() {
    openShareModal('profile');
};

function openShareModal(type, data = null) {
    const modal = document.getElementById('share-modal');
    if (!modal) return;
    const user = db.getOwner();
    
    let profileUrl;
    let originUrl = window.location.origin;
    if (originUrl === 'null' || !originUrl || originUrl.startsWith('file') || originUrl.includes('localhost')) {
        profileUrl = `https://wonderduo.vercel.app/#u/${user.handle}`;
    } else {
        profileUrl = `${originUrl}${window.location.pathname}#u/${user.handle}`;
    }
    
    let shareUrl = profileUrl;
    let defaultTweetText = '';
    
    if (type === 'qa' && data) {
        shareUrl = `${profileUrl}?q=${data.id}`;
        defaultTweetText = `"${data.text}" — Q&A by ${user.displayName} (@${user.handle})`;
    } else {
        defaultTweetText = `Ask me anything on my BkDk Q&A space! 💥⚡`;
    }
    
    // Set text input value
    const textarea = document.getElementById('share-custom-text');
    if (textarea) {
        textarea.value = shareUrl;
    }
    
    // Setup Copy Link action
    const copyBtn = document.getElementById('share-opt-copy');
    if (copyBtn) {
        const newCopyBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
        newCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast("Link copied to clipboard!", "success");
                modal.style.display = 'none';
            }).catch(() => {
                showToast("Failed to copy link", "error");
            });
        });
    }
    
    // Set X/Twitter share link
    const twitterLink = document.getElementById('share-opt-twitter');
    if (twitterLink) {
        twitterLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(defaultTweetText)}&url=${encodeURIComponent(shareUrl)}`;
        twitterLink.target = '_blank';
    }
    
    // Set Facebook share link
    const fbLink = document.getElementById('share-opt-facebook');
    if (fbLink) {
        fbLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        fbLink.target = '_blank';
    }
    
    // Set Bluesky share link
    const bskyLink = document.getElementById('share-opt-bluesky');
    if (bskyLink) {
        bskyLink.href = `https://bsky.app/intent/compose?text=${encodeURIComponent(defaultTweetText + ' ' + shareUrl)}`;
        bskyLink.target = '_blank';
    }
    
    // Display Modal
    modal.style.display = 'flex';
}

// Global click listener to close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('active');
    });
});

window.quoteItem = function(id) {
    const q = db.getQuestions().find(item => item.id === id);
    if (q) {
        activeQuoteItem = q;
        
        // Scroll to ask box
        const askBox = document.getElementById('pub-ask-box-container');
        if (askBox) {
            askBox.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Focus textarea
        const textarea = document.getElementById('pub-ask-textarea');
        if (textarea) {
            textarea.focus();
        }
        
        // Re-render to show active quote banner
        const owner = db.getOwner();
        renderPublicProfile(owner);
    }
};

window.jumpToPublicItem = function(id) {
    // Route to profile if not there
    if (!window.location.hash.startsWith('#u/')) {
        const owner = db.getOwner();
        window.location.hash = `#u/${owner.handle}`;
    }
    
    const q = db.getQuestions().find(item => item.id === id);
    if (!q) return;
    
    // Select proper feed tab
    if (q.isPost) {
        activePublicTab = 'posts';
        document.getElementById('tab-posts').classList.add('active');
        document.getElementById('tab-answers').classList.remove('active');
    } else {
        activePublicTab = 'answers';
        document.getElementById('tab-answers').classList.add('active');
        document.getElementById('tab-posts').classList.remove('active');
    }
    
    // Re-render
    const owner = db.getOwner();
    renderPublicProfile(owner);
    
    // Highlight
    setTimeout(() => {
        const target = document.getElementById(`qa-card-public-${id}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.outline = '3px solid var(--accent-color)';
            target.style.boxShadow = '0 0 15px var(--accent-bg-glow)';
            setTimeout(() => {
                target.style.outline = 'none';
                target.style.boxShadow = 'none';
            }, 2000);
        }
    }, 150);
};

window.openLoginModal = function() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.showDesktopNotification = function(q) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        const title = "New Q&A Question! 💥⚡";
        const options = {
            body: `"${q.text}" - from ${q.senderName || 'Anonymous'}`,
            icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2300ffcc"/><stop offset="100%" stop-color="%23ff5e00"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g)"/><text x="50" y="65" font-size="42" text-anchor="middle">💥</text></svg>',
            tag: q.id
        };
        const notification = new Notification(title, options);
        notification.onclick = function() {
            window.focus();
            window.location.hash = '#dashboard';
        };
    }
};
