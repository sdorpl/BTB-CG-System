const DB_KEY = 'cg_db';
const CHANNEL_NAME = 'cg_channel';

// 1. Initialize State and Broadcast Channel
const channel = new BroadcastChannel(CHANNEL_NAME);
let state = { templates: [], graphics: [], settings: {} };

async function init() {
    try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            state = JSON.parse(stored);
        } else {
            // First time load
            const res = await fetch('db.json');
            state = await res.json();
            saveState();
        }
    } catch (err) {
        console.error("Failed to load DB", err);
    }

    // Initial Render
    renderGraphics();

    // Hide Loader
    document.getElementById('loading').classList.add('hidden');
    const container = document.getElementById('graphics-container');
    container.classList.remove('hidden');

    // Trigger animation
    setTimeout(() => {
        container.classList.remove('opacity-0');
    }, 50);
}

// 2. State Management
function saveState() {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
    broadcastSync();
}

function broadcastSync() {
    channel.postMessage({ type: 'SYNC_STATE', payload: state });
}

// Listen to reset
document.getElementById('reset-db-btn').addEventListener('click', async () => {
    if (confirm("Are you sure you want to reset to original db.json? All changes will be lost.")) {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('graphics-container').classList.add('hidden');

        localStorage.removeItem(DB_KEY);
        const res = await fetch('db.json');
        state = await res.json();
        saveState();
        renderGraphics();

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('graphics-container').classList.remove('hidden');
    }
});

// 3. UI Generation
function renderGraphics() {
    const container = document.getElementById('graphics-container');
    container.innerHTML = '';

    state.graphics.forEach(graphic => {
        // Find template name for UI
        const tpl = state.templates.find(t => t.id === graphic.templateId);
        const templateName = tpl ? tpl.name : 'Unknown Template';

        const card = document.createElement('div');
        card.className = `bg-card rounded-2xl border ${graphic.visible ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-slate-800'} p-6 transition-all duration-300 relative overflow-hidden group`;

        // Status indicator pulse
        const pulse = graphic.visible ? `<div class="absolute top-4 right-4 flex items-center gap-2"><div class="w-3 h-3 bg-red-500 rounded-full animate-pulse-slow shadow-[0_0_10px_rgba(239,68,68,1)]"></div><span class="text-xs font-bold text-red-500">ON AIR</span></div>` : '';

        // Simple Input binding template
        const titleVal = graphic.title || '';
        const subtitleVal = graphic.subtitle || '';

        card.innerHTML = `
            ${pulse}
            <div class="flex flex-col gap-5">
                <div>
                    <h3 class="text-lg font-bold text-slate-100">${graphic.name}</h3>
                    <p class="text-xs text-slate-400">Template: ${templateName}</p>
                </div>
                
                <div class="space-y-3 pt-2 border-t border-slate-800">
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
                        <input type="text" data-id="${graphic.id}" data-field="title" value="${titleVal.replace(/"/g, '&quot;')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium">
                    </div>
                    ${graphic.type === 'CLOCK' || graphic.type === 'IMAGE' ? '' : `
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Subtitle / Additional Text</label>
                        <input type="text" data-id="${graphic.id}" data-field="subtitle" value="${subtitleVal.replace(/"/g, '&quot;')}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                    </div>
                    `}
                </div>
                
                <div class="pt-4 flex items-center justify-between border-t border-slate-800/50 mt-2">
                    <button data-toggle-id="${graphic.id}" class="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm transition-all ${graphic.visible ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'}">
                        ${graphic.visible ?
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.578 1 1 0 0 1 0 .692 10.741 10.741 0 0 1-4.714 5.485m-3.899 1.139a10.74 10.74 0 0 1-11.205-6.624 1 1 0 0 1 0-.692 10.74 10.74 0 0 1 4.714-5.485"/><path d="m2 2 20 20"/></svg> TAKE OFF AIR'
                :
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> TAKE ON AIR'}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Bind Toggle Events
    document.querySelectorAll('[data-toggle-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-toggle-id');
            const target = state.graphics.find(g => g.id === id);
            if (target) {
                target.visible = !target.visible;
                saveState();
                renderGraphics(); // re-render UI to flip states
            }
        });
    });

    // Bind Input Input Events
    document.querySelectorAll('input[data-field]').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = e.target.getAttribute('data-id');
            const field = e.target.getAttribute('data-field');
            const target = state.graphics.find(g => g.id === id);
            if (target) {
                target[field] = e.target.value;
                // Important: if relying on `titleLines` or `titleHtml` from imported DB, sync it
                // To keep minimal, we just update root text fields here.
                if (field === 'title') target.titleHtml = ""; // Force fallback to flat title if edited
                saveState();
            }
        });
    });
}

// Start app
init();
