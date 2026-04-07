/* StretchLibrary - App JS */

// --- Storage ---
const storage = {
    save(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
};

// --- State ---
let exercises = storage.get('exercises') || [];
let plans = storage.get('plans') || [];
let currentCategory = 'all';

// --- Category labels ---
const CATEGORY_LABELS = {
    cuello: '🦒 Cuello',
    hombros: '💪 Hombros',
    espalda_superior: '🔝 Espalda Alta',
    espalda_baja: '🔙 Espalda Baja',
    pecho: '🫁 Pecho',
    brazos: '💪 Brazos',
    caderas: '🦴 Caderas',
    piernas: '🦵 Piernas',
    tobillos_pies: '🦶 Tobillos/Pies',
    full_body: '🧘 Full Body'
};

// --- Toast notification ---
function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
}

// --- Modal helpers ---
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
    }
});

// --- View navigation ---
function showView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    document.getElementById(view + 'View').classList.add('active');
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    if (view === 'plans') renderPlans();
}

// --- Category filter ---
function filterCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-cat="${cat}"]`).classList.add('active');
    renderExercises();
}

// --- Sanitize text for safe HTML rendering ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// --- Render exercises ---
function renderExercises() {
    const grid = document.getElementById('exercisesGrid');
    const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase().trim();

    let filtered = exercises;

    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(e => e.categoria === currentCategory);
    }

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(e =>
            (e.nombre || '').toLowerCase().includes(searchTerm) ||
            (e.descripcion || '').toLowerCase().includes(searchTerm) ||
            (e.categoria || '').toLowerCase().includes(searchTerm) ||
            (e.musculos || []).some(m => m.toLowerCase().includes(searchTerm)) ||
            (e.tags || []).some(t => t.toLowerCase().includes(searchTerm))
        );
    }

    // Stats
    renderStats(filtered);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${searchTerm ? '🔍' : '🧘'}</div>
                <div class="empty-state-text">${searchTerm ? 'No se encontraron resultados' : 'No hay estiramientos'}</div>
                <div class="empty-state-sub">${searchTerm ? 'Prueba con otro término de búsqueda' : '¡Añade tu primer estiramiento!'}</div>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(ex => {
        const catLabel = CATEGORY_LABELS[ex.categoria] || '🧘 General';
        const levelClass = (ex.nivel || '').toLowerCase();
        const tags = (ex.tags || []).slice(0, 4);
        const escapedNombre = escapeHtml(ex.nombre || 'Sin nombre');
        const escapedDescripcion = escapeHtml(ex.descripcion || '');
        const escapedBeneficios = escapeHtml(ex.beneficios || '');
        const escapedUrl = escapeHtml(ex.url || '');

        return `
            <div class="exercise-card" onclick="showExerciseDetail(${ex.id})">
                <div class="card-header">
                    <div>
                        <div class="card-title">${escapedNombre}</div>
                    </div>
                    <span class="card-category">${escapeHtml(catLabel)}</span>
                </div>
                <div class="card-description">${escapedDescripcion || escapedBeneficios}</div>
                <div class="card-tags">
                    <span class="card-level ${escapeHtml(levelClass)}">${escapeHtml(ex.nivel || 'Todos')}</span>
                    ${tags.map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}
                </div>
                <div class="card-actions">
                    ${escapedUrl ? `<a class="card-link" href="${escapedUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">▶ Ver video</a>` : '<span></span>'}
                    <div style="display:flex; gap:0.5rem;">
                        <button class="share-btn" onclick="event.stopPropagation(); shareExercise(${ex.id})">📤 Compartir</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteExercise(${ex.id})" style="margin:0; font-size:0.75rem;">🗑️</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- Stats ---
function renderStats(filtered) {
    const stats = document.getElementById('statsBar');
    const categoryCount = {};
    filtered.forEach(e => {
        const cat = e.categoria || 'otros';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    stats.innerHTML = `
        <div class="stat-item"><strong>${filtered.length}</strong> estiramientos</div>
        ${Object.entries(categoryCount).slice(0, 3).map(([cat, count]) =>
            `<div class="stat-item"><strong>${count}</strong> ${escapeHtml(CATEGORY_LABELS[cat] || cat)}</div>`
        ).join('')}
    `;
}

// --- Exercise detail ---
function showExerciseDetail(id) {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;

    const content = document.getElementById('detailContent');
    const escapedNombre = escapeHtml(ex.nombre || 'Sin nombre');
    const escapedDescripcion = escapeHtml(ex.descripcion || 'Sin descripción');
    const escapedBeneficios = escapeHtml(ex.beneficios || '');
    const escapedUrl = escapeHtml(ex.url || '');
    const catLabel = CATEGORY_LABELS[ex.categoria] || 'General';
    const levelClass = (ex.nivel || '').toLowerCase();

    content.innerHTML = `
        <h3 style="margin-bottom: 0.75rem;">${escapedNombre}</h3>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
            <span class="card-category">${escapeHtml(catLabel)}</span>
            <span class="card-level ${escapeHtml(levelClass)}">${escapeHtml(ex.nivel || 'Todos')}</span>
            ${ex.duracion ? `<span class="card-tag">⏱ ${escapeHtml(String(ex.duracion))} min</span>` : ''}
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">${escapedDescripcion}</p>
        ${escapedBeneficios ? `<p style="font-size: 0.85rem; margin-bottom: 0.75rem;"><strong>Beneficios:</strong> ${escapedBeneficios}</p>` : ''}
        ${(ex.musculos || []).length > 0 ? `
            <div style="margin-bottom: 0.75rem;">
                <strong style="font-size: 0.85rem;">Músculos:</strong>
                <div class="card-tags" style="margin-top: 0.3rem;">
                    ${ex.musculos.map(m => `<span class="card-tag">${escapeHtml(m)}</span>`).join('')}
                </div>
            </div>` : ''}
        ${(ex.tags || []).length > 0 ? `
            <div style="margin-bottom: 0.75rem;">
                <strong style="font-size: 0.85rem;">Tags:</strong>
                <div class="card-tags" style="margin-top: 0.3rem;">
                    ${ex.tags.map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>` : ''}
        ${escapedUrl ? `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="add-btn full-width" style="display:block; text-align:center; margin-top:1rem; text-decoration:none;">▶ Ver Video</a>` : ''}
        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
            <button class="share-btn" style="flex:1; padding:0.6rem;" onclick="shareExercise(${id})">📤 Compartir</button>
            <button class="delete-btn" style="flex:1; margin:0; border:1px solid var(--danger); border-radius:8px; padding:0.6rem;" onclick="deleteExercise(${id}); closeModal('detailModal');">🗑️ Eliminar</button>
        </div>
    `;
    openModal('detailModal');
}

// --- Analyze with Claude (via secure backend proxy) ---
async function handleAnalyze() {
    const urlInput = document.getElementById('videoUrl');
    const url = urlInput.value.trim();

    if (!url) return showToast('⚠️ Pega una URL de video.');

    const btn = document.getElementById('analyzeBtn');
    btn.innerHTML = '<span class="spinner"></span> Analizando con Claude...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al analizar el video.');
        }

        const exercise = data.exercise;
        exercise.url = url;
        exercise.id = Date.now();
        exercise.createdAt = new Date().toISOString();

        exercises.unshift(exercise);
        storage.save('exercises', exercises);
        renderExercises();
        urlInput.value = '';
        closeModal('addModal');
        showToast('✅ Estiramiento analizado y guardado.');
    } catch (e) {
        showToast('❌ ' + e.message);
    } finally {
        btn.innerHTML = '🤖 Analizar con Claude';
        btn.disabled = false;
    }
}

// --- Manual add ---
function handleManualAdd() {
    const name = document.getElementById('manualName').value.trim();
    const category = document.getElementById('manualCategory').value;
    const level = document.getElementById('manualLevel').value;
    const url = document.getElementById('manualUrl').value.trim();

    if (!name) return showToast('⚠️ Escribe un nombre para el estiramiento.');
    if (!category) return showToast('⚠️ Selecciona una categoría.');

    const exercise = {
        id: Date.now(),
        nombre: name,
        categoria: category,
        nivel: level || 'principiante',
        url: url || '',
        musculos: [],
        tags: [],
        descripcion: '',
        beneficios: '',
        createdAt: new Date().toISOString()
    };

    exercises.unshift(exercise);
    storage.save('exercises', exercises);
    renderExercises();

    // Clear form
    document.getElementById('manualName').value = '';
    document.getElementById('manualCategory').value = '';
    document.getElementById('manualLevel').value = '';
    document.getElementById('manualUrl').value = '';

    closeModal('addModal');
    showToast('✅ Estiramiento guardado manualmente.');
}

// --- Delete exercise ---
function deleteExercise(id) {
    if (confirm('¿Eliminar este estiramiento de tu biblioteca?')) {
        exercises = exercises.filter(e => e.id !== id);
        storage.save('exercises', exercises);
        renderExercises();
        showToast('🗑️ Estiramiento eliminado.');
    }
}

// --- Share exercise ---
async function shareExercise(id) {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;

    const text = `🧘 ${ex.nombre}\n📂 ${CATEGORY_LABELS[ex.categoria] || 'General'}\n📊 ${ex.nivel || 'Todos los niveles'}\n${ex.descripcion ? '\n' + ex.descripcion : ''}${ex.url ? '\n\n▶ ' + ex.url : ''}`;

    if (navigator.share) {
        try {
            await navigator.share({ title: ex.nombre, text });
        } catch {
            // User cancelled share
        }
    } else {
        await navigator.clipboard.writeText(text);
        showToast('📋 Copiado al portapapeles.');
    }
}

// ==================== PLANS ====================

// --- Render plans ---
function renderPlans() {
    const grid = document.getElementById('plansGrid');

    if (plans.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No tienes planes de estiramientos</div>
                <div class="empty-state-sub">Añade estiramientos y genera un plan con IA</div>
            </div>`;
        return;
    }

    grid.innerHTML = plans.map(plan => `
        <div class="plan-card" onclick="showPlanDetail(${plan.id})">
            <div class="plan-name">${escapeHtml(plan.nombre_plan || 'Plan sin nombre')}</div>
            <div class="plan-desc">${escapeHtml(plan.descripcion || '')}</div>
            <div class="plan-meta">
                <span>⏱ ${escapeHtml(String(plan.duracion_total || '?'))} min</span>
                <span>📊 ${escapeHtml(plan.nivel || 'Todos')}</span>
                <span>🏋️ ${(plan.rutina || []).length} ejercicios</span>
            </div>
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                <button class="share-btn" onclick="event.stopPropagation(); sharePlan(${plan.id})">📤 Compartir</button>
                <button class="delete-btn" onclick="event.stopPropagation(); deletePlan(${plan.id})" style="margin:0; font-size:0.75rem;">🗑️</button>
            </div>
        </div>
    `).join('');
}

// --- Generate plan with AI ---
async function generatePlan(event) {
    if (exercises.length < 2) {
        return showToast('⚠️ Necesitas al menos 2 estiramientos para generar un plan.');
    }

    const btn = event.target;
    btn.innerHTML = '<span class="spinner"></span> Generando plan...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/suggest-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exercises: exercises.slice(0, 30) })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al generar el plan.');
        }

        const plan = data.plan;
        plan.id = Date.now();
        plan.createdAt = new Date().toISOString();
        plan.exerciseIds = exercises.slice(0, 30).map(e => e.id);

        plans.unshift(plan);
        storage.save('plans', plans);
        renderPlans();
        showToast('✅ Plan de estiramientos generado.');
    } catch (e) {
        showToast('❌ ' + e.message);
    } finally {
        btn.innerHTML = '✨ Generar Plan con IA';
        btn.disabled = false;
    }
}

// --- Plan detail ---
function showPlanDetail(id) {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    const content = document.getElementById('planDetailContent');
    const routineItems = (plan.rutina || []).map(item => {
        const ex = exercises.find(e =>
            plan.exerciseIds && plan.exerciseIds[item.ejercicio_index]
                ? e.id === plan.exerciseIds[item.ejercicio_index]
                : false
        );
        const name = ex ? ex.nombre : `Ejercicio ${item.orden || item.ejercicio_index + 1}`;

        return `
            <div class="plan-routine-item">
                <div class="routine-number">${item.orden || ''}</div>
                <div class="routine-info">
                    <div class="routine-name">${escapeHtml(name)}</div>
                    <div class="routine-detail">${escapeHtml(item.repeticiones || '')} ${item.notas ? '· ' + escapeHtml(item.notas) : ''}</div>
                </div>
            </div>`;
    }).join('');

    const tips = (plan.consejos || []).map(c => `<li style="margin-bottom:0.3rem;">${escapeHtml(c)}</li>`).join('');

    content.innerHTML = `
        <h3 style="margin-bottom:0.25rem;">${escapeHtml(plan.nombre_plan || 'Plan')}</h3>
        <div class="plan-meta" style="margin-bottom:1rem;">
            <span>⏱ ${escapeHtml(String(plan.duracion_total || '?'))} min</span>
            <span>📊 ${escapeHtml(plan.nivel || 'Todos')}</span>
        </div>
        <p style="color: var(--text-secondary); font-size:0.9rem; margin-bottom:1rem;">${escapeHtml(plan.descripcion || '')}</p>
        <h4 style="margin-bottom:0.5rem;">Rutina</h4>
        ${routineItems || '<p style="color:var(--text-secondary)">Sin ejercicios definidos</p>'}
        ${tips ? `<h4 style="margin-top:1rem; margin-bottom:0.5rem;">💡 Consejos</h4><ul style="padding-left:1.25rem; color:var(--text-secondary); font-size:0.85rem;">${tips}</ul>` : ''}
        <button class="share-btn full-width" style="padding:0.6rem; margin-top:1rem;" onclick="sharePlan(${plan.id})">📤 Compartir plan</button>
        <button class="delete-btn" style="width:100%; text-align:center; margin-top:0.5rem; border:1px solid var(--danger); border-radius:8px; padding:0.5rem;" onclick="deletePlan(${plan.id}); closeModal('planDetailModal');">🗑️ Eliminar plan</button>
    `;
    openModal('planDetailModal');
}

// --- Delete plan ---
function deletePlan(id) {
    if (confirm('¿Eliminar este plan?')) {
        plans = plans.filter(p => p.id !== id);
        storage.save('plans', plans);
        renderPlans();
        showToast('🗑️ Plan eliminado.');
    }
}

// --- Share plan ---
async function sharePlan(id) {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    let text = `📋 ${plan.nombre_plan}\n📊 ${plan.nivel || 'Todos'} · ⏱ ${plan.duracion_total || '?'} min\n\n${plan.descripcion || ''}\n\n`;

    (plan.rutina || []).forEach(item => {
        const ex = exercises.find(e =>
            plan.exerciseIds && plan.exerciseIds[item.ejercicio_index]
                ? e.id === plan.exerciseIds[item.ejercicio_index]
                : false
        );
        const name = ex ? ex.nombre : `Ejercicio ${item.orden}`;
        text += `${item.orden}. ${name} - ${item.repeticiones || ''}\n`;
    });

    if (navigator.share) {
        try {
            await navigator.share({ title: plan.nombre_plan, text });
        } catch {
            // User cancelled share
        }
    } else {
        await navigator.clipboard.writeText(text);
        showToast('📋 Plan copiado al portapapeles.');
    }
}

// ==================== INIT ====================

// Web Share Target: capture shared link
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url') || params.get('text');
    if (sharedUrl) {
        const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            openModal('addModal');
            document.getElementById('videoUrl').value = urlMatch[0];
        }
        // Clean up URL params
        window.history.replaceState({}, '', window.location.pathname);
    }

    renderExercises();
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log('SW registrado'));
}
