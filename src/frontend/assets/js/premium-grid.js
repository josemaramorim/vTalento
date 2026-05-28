class PremiumGrid {
    constructor(config) {
        this.containerId = config.containerId;
        this.title = config.title || 'Resultados';
        this.totalCountId = config.totalCountId || 'pgTotalCount';
        this.columns = config.columns || [];
        this.filtersConfig = config.filters || null;
        this.paginationConfig = config.pagination || { enabled: false };
        this.summaryConfig = config.summary || { enabled: false };
        this.fetchFn = config.fetchFn;
        this.cellRenderer = config.cellRenderer;
        this.layout = config.layout || 'table'; // 'table' or 'cards'
        this.cardRenderer = config.cardRenderer || null;
        
        // State
        this.state = {
            data: [],
            total: 0,
            page: 1,
            limit: this.paginationConfig.defaultPageSize || 10,
            sortBy: config.defaultSort?.key || null,
            sortDir: config.defaultSort?.direction || 'asc',
            filters: {}
        };

        this.container = document.getElementById(this.containerId);
        if (!this.container) throw new Error(`Container ${this.containerId} not found`);
    }

    async init() {
        this.renderStructure();
        this.attachEventListeners();
        await this.refresh();
    }

    renderStructure() {
        let html = `
            <div class="pg-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="font-size: 1.2rem; color: var(--text-primary); margin: 0;">${this.title}</h2>
                <span id="${this.totalCountId}" style="font-size: 0.85rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px;">Carregando...</span>
            </div>
        `;

        if (this.filtersConfig && this.filtersConfig.length > 0) {
            html += this.renderFilters();
        }

        if (this.layout === 'table') {
            html += `
                <div class="table-responsive">
                    <table class="premium-table">
                        <thead>
                            <tr>${this.renderHeaders()}</tr>
                        </thead>
                        <tbody id="${this.containerId}-tbody">
                            <tr><td colspan="${this.columns.length}" style="text-align:center; color: var(--text-secondary);">Carregando dados...</td></tr>
                        </tbody>
                        ${this.summaryConfig.enabled ? `<tfoot class="pg-tfoot" id="${this.containerId}-tfoot"></tfoot>` : ''}
                    </table>
                </div>
            `;
        } else if (this.layout === 'cards') {
            html += `
                <div id="${this.containerId}-tbody" class="pg-cards-layout vitrine-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; margin-top: 20px;">
                    <div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 40px;">Carregando dados...</div>
                </div>
            `;
        }

        if (this.paginationConfig.enabled) {
            html += this.renderPagination();
        }

        this.container.innerHTML = html;
        if(this.filtersConfig) this.populateDynamicFilters();
    }

    renderFilters() {
        let filterHtml = `<div class="pg-filter-bar glass" style="margin-bottom: 20px; padding: 20px;"><div class="pg-filter-grid">`;
        
        this.filtersConfig.forEach(f => {
            filterHtml += `<div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 6px; display: block;">${f.label}</label>`;
            
            if (f.type === 'select') {
                filterHtml += `<select id="${this.containerId}-filter-${f.id}">
                    <option value="">Todos</option>
                    ${f.options ? f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('') : ''}
                </select>`;
            } else if (f.type === 'date') {
                filterHtml += `<input type="date" id="${this.containerId}-filter-${f.id}">`;
            } else {
                filterHtml += `<input type="text" id="${this.containerId}-filter-${f.id}" placeholder="Buscar...">`;
            }
            filterHtml += `</div>`;
        });

        filterHtml += `</div>
            <div class="pg-filter-actions" style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn" id="${this.containerId}-btn-clear-filters" style="background: rgba(255,255,255,0.08); color: var(--text-primary);">LIMPAR</button>
                <button type="button" class="btn btn-primary" id="${this.containerId}-btn-apply-filters">FILTRAR</button>
            </div>
        </div>`;
        return filterHtml;
    }

    renderHeaders() {
        return this.columns.map(col => {
            const isSortable = col.sortable ? 'pg-sortable' : '';
            const align = col.align ? `text-align: ${col.align};` : '';
            let sortIcon = '';
            
            if (col.sortable) {
                const isActive = this.state.sortBy === col.key;
                const arrow = isActive ? (this.state.sortDir === 'asc' ? '▲' : '▼') : '↕';
                const activeClass = isActive ? 'active' : '';
                sortIcon = ` <span class="pg-sort-icon ${activeClass}">${arrow}</span>`;
            }

            return `<th class="${isSortable}" data-key="${col.key}" style="cursor: ${col.sortable?'pointer':'default'}; ${align}">${col.label}${sortIcon}</th>`;
        }).join('');
    }

    renderPagination() {
        const sizes = this.paginationConfig.pageSizeOptions || [10, 50, 100];
        const optionsHtml = sizes.map(s => `<option value="${s}" ${this.state.limit === s ? 'selected' : ''}>${s}</option>`).join('');

        return `
            <div class="premium-pagination-bar">
                <div class="premium-pagination-info" id="${this.containerId}-pag-info">—</div>
                <div class="premium-pagination-controls">
                    <label style="font-size: 0.8rem; color: var(--text-secondary);">Registros por página:</label>
                    <select id="${this.containerId}-limit-select">
                        ${optionsHtml}
                    </select>
                    <button class="premium-pagination-btn" id="${this.containerId}-btn-prev" disabled>← Anterior</button>
                    <button class="premium-pagination-btn" id="${this.containerId}-btn-next">Próximo →</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Filters
        if (this.filtersConfig) {
            const btnApply = document.getElementById(`${this.containerId}-btn-apply-filters`);
            const btnClear = document.getElementById(`${this.containerId}-btn-clear-filters`);
            
            if (btnApply) btnApply.addEventListener('click', () => this.applyFilters());
            if (btnClear) btnClear.addEventListener('click', () => this.clearFilters());
        }

        // Sorting
        const ths = this.container.querySelectorAll('th.pg-sortable');
        ths.forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.getAttribute('data-key')));
        });

        // Pagination
        if (this.paginationConfig.enabled) {
            const limitSelect = document.getElementById(`${this.containerId}-limit-select`);
            const btnPrev = document.getElementById(`${this.containerId}-btn-prev`);
            const btnNext = document.getElementById(`${this.containerId}-btn-next`);

            if (limitSelect) limitSelect.addEventListener('change', (e) => {
                this.state.limit = parseInt(e.target.value);
                this.state.page = 1;
                this.refresh();
            });

            if (btnPrev) btnPrev.addEventListener('click', () => {
                if (this.state.page > 1) {
                    this.state.page--;
                    this.refresh();
                }
            });

            if (btnNext) btnNext.addEventListener('click', () => {
                const totalPages = Math.ceil(this.state.total / this.state.limit);
                if (this.state.page < totalPages) {
                    this.state.page++;
                    this.refresh();
                }
            });
        }
    }

    async populateDynamicFilters() {
        // Here we could allow filtersConfig to define async options, 
        // For now, if dynamic is true, the host page is responsible for populating it by looking up the ID
    }

    handleSort(key) {
        if (this.state.sortBy === key) {
            this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortBy = key;
            this.state.sortDir = 'asc';
        }
        
        // Re-render headers to update sort icons
        const theadTr = this.container.querySelector('thead tr');
        theadTr.innerHTML = this.renderHeaders();
        
        // Re-attach sort events since we rewrote the innerHTML
        const ths = this.container.querySelectorAll('th.pg-sortable');
        ths.forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.getAttribute('data-key')));
        });

        this.refresh();
    }

    applyFilters() {
        this.filtersConfig.forEach(f => {
            const el = document.getElementById(`${this.containerId}-filter-${f.id}`);
            if (el) {
                this.state.filters[f.id] = el.value;
            }
        });
        this.state.page = 1;
        this.refresh();
    }

    clearFilters() {
        this.filtersConfig.forEach(f => {
            const el = document.getElementById(`${this.containerId}-filter-${f.id}`);
            if (el) el.value = '';
        });
        this.state.filters = {};
        this.state.page = 1;
        this.refresh();
    }

    async refresh() {
        const tbody = document.getElementById(`${this.containerId}-tbody`);
        if (this.layout === 'table') {
            tbody.innerHTML = `<tr><td colspan="${this.columns.length}" style="text-align:center; color: var(--text-secondary);">Carregando dados...</td></tr>`;
        } else {
            tbody.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 40px;">Carregando dados...</div>`;
        }

        try {
            const result = await this.fetchFn({
                filters: this.state.filters,
                page: this.state.page,
                limit: this.state.limit,
                sortBy: this.state.sortBy,
                sortDir: this.state.sortDir
            });

            this.state.data = result.rows || [];
            this.state.total = result.total || 0;

            this.renderTableBody();
            this.updateFooter();
            
            const totalLabel = document.getElementById(this.totalCountId);
            if (totalLabel) totalLabel.innerText = `${this.state.total} resultado(s)`;

            if (this.paginationConfig.enabled) {
                this.updatePaginationUI();
            }

        } catch (error) {
            console.error('PremiumGrid Error:', error);
            tbody.innerHTML = `<tr><td colspan="${this.columns.length}" style="text-align:center; color: var(--error);">Erro ao carregar dados. ${error.message}</td></tr>`;
        }
    }

    renderTableBody() {
        const tbody = document.getElementById(`${this.containerId}-tbody`);
        if (this.state.data.length === 0) {
            if (this.layout === 'table') {
                tbody.innerHTML = `<tr><td colspan="${this.columns.length}" style="text-align:center; color: var(--text-secondary); padding: 40px;">Nenhum registro encontrado.</td></tr>`;
            } else {
                tbody.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 40px;">Nenhum registro encontrado.</div>`;
            }
            return;
        }

        let html = '';
        this.state.data.forEach(row => {
            if (this.layout === 'table') {
                html += '<tr>';
                this.columns.forEach(col => {
                    const align = col.align ? `text-align: ${col.align};` : '';
                    const bold = col.bold ? 'font-weight: 600;' : '';
                    const highlight = col.highlight ? 'color: var(--accent-primary); font-weight: 600;' : '';
                    const customStyle = `${align} ${bold} ${highlight}`;

                    let content = row[col.key] || '';
                    
                    if (this.cellRenderer) {
                        const customContent = this.cellRenderer(row, col);
                        if (customContent !== undefined) {
                            content = customContent;
                        }
                    } else if (col.type === 'badge') {
                        // Default badge rendering if no cellRenderer provided
                        const badgeClass = String(content).toLowerCase().replace(/ /g, '-');
                        content = `<span class="badge badge-${badgeClass}" style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${content}</span>`;
                    }

                    html += `<td style="${customStyle}">${content}</td>`;
                });
                html += '</tr>';
            } else if (this.layout === 'cards') {
                if (this.cardRenderer) {
                    html += this.cardRenderer(row);
                } else {
                    html += `<div class="pg-card" style="padding: 20px; border: 1px solid var(--glass-border); border-radius: var(--radius-md); background: var(--glass-bg);">` + 
                            JSON.stringify(row) + 
                            `</div>`;
                }
            }
        });
        tbody.innerHTML = html;
    }

    updateFooter() {
        if (!this.summaryConfig.enabled) return;
        const tfoot = document.getElementById(`${this.containerId}-tfoot`);
        if (!tfoot) return;

        let html = '<tr>';
        this.columns.forEach((col, index) => {
            const align = col.align ? `text-align: ${col.align};` : '';
            const bold = 'font-weight: 700;';
            const highlight = col.highlight ? 'color: var(--accent-primary);' : '';
            const customStyle = `${align} ${bold} ${highlight}`;

            let cellContent = '';

            // Label na primeira coluna se configurado
            if (index === 0 && this.summaryConfig.label) {
                cellContent = this.summaryConfig.label;
            }

            // Fallback para customCells
            if (this.summaryConfig.customCells && this.summaryConfig.customCells[col.key] !== undefined) {
                cellContent = this.summaryConfig.customCells[col.key];
            }

            // Cálculos
            if (col.summaryFn && this.state.data.length > 0) {
                let val = 0;
                if (col.summaryFn === 'sum') {
                    val = this.state.data.reduce((acc, row) => acc + (parseFloat(row[col.key]) || 0), 0);
                    // Formatação rudimentar se for destaque (T$) - o cellRenderer deve formatar idealmente
                    cellContent = val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                } else if (col.summaryFn === 'count') {
                    cellContent = this.state.data.length;
                } else if (col.summaryFn === 'avg') {
                    val = this.state.data.reduce((acc, row) => acc + (parseFloat(row[col.key]) || 0), 0) / this.state.data.length;
                    cellContent = val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                }
                
                // Allow host to override formatting for summary
                if (typeof col.summaryFormat === 'function') {
                    cellContent = col.summaryFormat(val, this.state.data);
                }
            }

            html += `<td style="${customStyle}">${cellContent}</td>`;
        });
        html += '</tr>';
        tfoot.innerHTML = html;
    }

    updatePaginationUI() {
        const btnPrev = document.getElementById(`${this.containerId}-btn-prev`);
        const btnNext = document.getElementById(`${this.containerId}-btn-next`);
        const pagInfo = document.getElementById(`${this.containerId}-pag-info`);

        if (!btnPrev || !btnNext || !pagInfo) return;

        const totalPages = Math.ceil(this.state.total / this.state.limit);
        btnPrev.disabled = this.state.page <= 1;
        btnNext.disabled = this.state.page >= totalPages || totalPages === 0;

        if (this.state.total === 0) {
            pagInfo.innerText = '0 registros';
        } else {
            const start = ((this.state.page - 1) * this.state.limit) + 1;
            const end = Math.min(this.state.page * this.state.limit, this.state.total);
            pagInfo.innerText = `Página ${this.state.page} de ${totalPages || 1} — Exibindo ${start}-${end} de ${this.state.total}`;
        }
    }
}
window.PremiumGrid = PremiumGrid;
