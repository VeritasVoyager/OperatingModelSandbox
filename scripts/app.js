document.addEventListener('DOMContentLoaded', main);

function main() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange(); 
}

function handleRouteChange() {
    const hash = window.location.hash.substring(1);
    const views = {
        homepage: document.getElementById('homepage-view'),
        detail: document.getElementById('detail-view'),
        playbook: document.getElementById('playbook-view'),
        howToUse: document.getElementById('how-to-use-view'),
        methodology: document.getElementById('methodology-view'),
    };

    Object.values(views).forEach(view => view.classList.add('hidden'));

    if (hash.startsWith('playbook')) {
        views.playbook.classList.remove('hidden');
        loadAndRenderPlaybook();
    } else if (hash.startsWith('how-to-use')) {
        views.howToUse.classList.remove('hidden');
    } else if (hash.startsWith('methodology')) {
        views.methodology.classList.remove('hidden');
    } else if (hash) {
        views.detail.classList.remove('hidden');
        loadAndRenderDetail(hash);
    } else {
        views.homepage.classList.remove('hidden');
        loadAndRenderHomepage();
    }
}

// --- Data Loading Functions ---

function loadAndRenderHomepage() {
    // FIX: Changed path from '/data/...' to 'data/...'
    fetch('data/archetypes.json')
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`Failed to load archetypes: ${res.status}`)))
        .then(renderHomepage)
        .catch(err => console.error("Error loading homepage:", err));
}

function loadAndRenderDetail(slug) {
    // FIX: Changed path from '/data/...' to 'data/...'
    fetch(`data/${slug}.json`)
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`Failed to load detail for ${slug}: ${res.status}`)))
        .then(populateDetailPage)
        .catch(err => {
            console.error(`Error loading detail for ${slug}:`, err);
            document.getElementById('detail-view').innerHTML = `<h2>Error</h2><p>Could not load data for model: ${slug}. Please check the console for more details.</p>`;
        });
}

function loadAndRenderPlaybook() {
    // FIX: Changed path from '/data/...' to 'data/...'
    fetch('data/transformation_playbook.json')
        .then(res => res.ok ? res.json() : Promise.reject(new Error(`Failed to load playbook: ${res.status}`)))
        .then(renderPlaybook)
        .catch(err => console.error("Error loading playbook:", err));
}

// --- Rendering Functions (No changes below this line) ---

function renderHomepage(archetypes) {
    const homepageGrid = document.getElementById('homepage-grid');
    if (!homepageGrid) return;
    homepageGrid.innerHTML = '';

    archetypes.forEach(archetype => {
        const card = document.createElement('a');
        card.className = 'homepage-card';
        card.href = `#${archetype.file_slug}`;
        
        card.innerHTML = `
            <h3>${archetype.name}</h3>
            <p class="tagline">${archetype.tagline}</p>
            <div class="homepage-card-tags">
                <span>${archetype.best_for || 'N/A'}</span>
                <span>${archetype.size || 'N/A'}</span>
            </div>
        `;
        homepageGrid.appendChild(card);
    });
}

function renderPlaybook(data) {
    const container = document.getElementById('playbook-container');
    if (!container) return;
    container.innerHTML = ''; 

    data.forEach(section => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${section.section_title || 'Untitled Section'}</h3>
            <div class="card-content">
                ${section.section_content.replace(/\n/g, '<br><br>') || 'No content provided.'}
            </div>
        `;
        container.appendChild(card);
    });
}

function populateDetailPage(data) {
    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.innerText = text || 'No data provided.';
    };

    const populateList = (elementId, items) => {
        const list = document.getElementById(elementId);
        if (!list) return;
        list.innerHTML = '';
        if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerText = item;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<li>No data provided.</li>';
        }
    };

    document.title = data.model_name || "Operating Model";
    setText('model-name-header', data.model_name);

    const summaryContainer = document.getElementById('summary-content');
    if(summaryContainer) {
        summaryContainer.innerHTML = `<p>${data.description_long || 'No description provided.'}</p>`;
    }

    const tagsContainer = document.getElementById('tags-container');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        data.tags?.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'pill-tag';
            span.innerText = `${tag.tag_category}: ${tag.tag_value}`;
            tagsContainer.appendChild(span);
        });
    }

    populateList('strengths-list', data.strengths_weaknesses?.strengths);
    populateList('weaknesses-list', data.strengths_weaknesses?.weaknesses);

    const kpiList = document.getElementById('kpi-list');
    if (kpiList) {
        kpiList.innerHTML = '';
        data.kpis?.forEach(kpi => {
            const div = document.createElement('div');
            div.className = 'kpi-list-item';
            const indicator = kpi.kpi_type === 'Leading' ? '🔼' : kpi.kpi_type === 'Lagging' ? '🔽' : '●';
            div.innerHTML = `<span class="kpi-indicator">${indicator}</span> <span><strong>${kpi.kpi_name}:</strong> ${kpi.purpose}</span>`;
            kpiList.appendChild(div);
        });
    }

    const governanceText = document.getElementById('governance-text');
    if (governanceText) {
        governanceText.innerHTML = '';
        const governanceGroups = data.governance_leadership?.reduce((acc, item) => {
            (acc[item.category] = acc[item.category] || []).push(item.point);
            return acc;
        }, {});
        for (const category in governanceGroups) {
            const listItems = governanceGroups[category].map(point => `<li>${point}</li>`).join('');
            governanceText.innerHTML += `<h4>${category}</h4><ul>${listItems}</ul>`;
        }
    }

    const nuancesText = document.getElementById('industry-nuances-text');
    if (nuancesText) {
        nuancesText.innerHTML = '';
        data.industry_nuances?.forEach(item => {
            nuancesText.innerHTML += `
                <div class="nuance-group">
                    <h4>${item.industry_name}</h4>
                    <p><strong>Application:</strong> ${item.application || 'N/A'}</p>
                    <p><strong>Challenges:</strong> ${item.challenges || 'N/A'}</p>
                    <p><strong>Best Practices:</strong> ${item.best_practices || 'N/A'}</p>
                </div>`;
        });
    }

    const renderDecompView = (containerId, viewData) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!viewData || Object.keys(viewData).length === 0) {
            container.innerText = 'No decomposition data available.';
            return;
        }
        for (const groupName in viewData) {
            const listItems = viewData[groupName].map(item => `<li>${item.body_of_work}</li>`).join('');
            container.innerHTML += `<h5>${groupName}</h5><ul>${listItems}</ul>`;
        }
    };
    renderDecompView('functional-view-container', data.functional_view_data);
    renderDecompView('financial-view-container', data.financial_view_data);

    const aiIntegrationText = document.getElementById('ai-integration-text');
    if (aiIntegrationText) {
        aiIntegrationText.innerHTML = '';
        const aiGroups = data.ai_impact_points?.reduce((acc, item) => {
            (acc[item.impact_category] = acc[item.impact_category] || []).push(item.impact_description);
            return acc;
        }, {});
        for (const theme in aiGroups) {
            const listItems = aiGroups[theme].map(desc => `<li>${desc}</li>`).join('');
            aiIntegrationText.innerHTML += `<h4>${theme}</h4><ul>${listItems}</ul>`;
        }
    }
    
    const copyBtn = document.getElementById('copy-insights-btn');
    if(copyBtn) {
        copyBtn.onclick = () => {
            const insights = `
Operating Model: ${data.model_name}
Core Logic: ${data.description_short}
Strengths:
- ${data.strengths_weaknesses.strengths.join('\n- ')}
Weaknesses:
- ${data.strengths_weaknesses.weaknesses.join('\n- ')}
            `.trim();
            navigator.clipboard.writeText(insights).then(() => {
                copyBtn.textContent = '✅ Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy Key Insights';
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        };
    }
}