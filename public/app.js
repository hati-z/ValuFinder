/**
 * ValuFinder - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let allStocks = [];
    let state = {
        roeFilter: 'Exceptional', // Default to Exceptional ROE
        maxPEFilter: 35.0,
        minMoatFilter: 0.0, // Default to no moat filtering
        searchQuery: '',
        sortBy: 'pe', // 'pe', 'name', or 'moat'
        sortOrder: 'asc' // 'asc' or 'desc'
    };

    // DOM Elements
    const elements = {
        stockGrid: document.getElementById('stock-grid'),
        roeFilter: document.getElementById('roe-filter'),
        peSlider: document.getElementById('pe-slider'),
        peDisplay: document.getElementById('pe-value-display'),
        moatSlider: document.getElementById('moat-slider'),
        moatDisplay: document.getElementById('moat-value-display'),
        searchInput: document.getElementById('search-input'),
        sortButtons: document.querySelectorAll('.sort-btn'),
        resultCount: document.getElementById('result-count'),
        resetFilters: document.getElementById('reset-filters')
    };

    // Initialize App
    async function init() {
        try {
            const response = await fetch('http://localhost:3000/api/stocks');
            if (!response.ok) throw new Error('Failed to load stock data');

            allStocks = await response.json();

            setupEventListeners();

            // Initial render based on default state
            elements.peSlider.value = state.maxPEFilter;
            elements.peDisplay.textContent = state.maxPEFilter >= 100 ? '100+' : state.maxPEFilter.toFixed(1);
            elements.moatSlider.value = state.minMoatFilter;
            elements.moatDisplay.textContent = state.minMoatFilter.toFixed(1);
            elements.roeFilter.value = state.roeFilter;

            renderStocks();
        } catch (error) {
            console.error('Error initializing app:', error);
            elements.stockGrid.innerHTML = `
                <div class="loading-state">
                    <i class="ph ph-warning-circle" style="font-size: 48px; color: var(--accent-danger); margin-bottom: 16px;"></i>
                    <p style="color: var(--accent-danger)">Failed to load data. Please ensure you are running a local server.</p>
                </div>
            `;
        }
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // ROE Filter
        elements.roeFilter.addEventListener('change', (e) => {
            state.roeFilter = e.target.value;
            renderStocks();
        });

        // P/E Slider
        elements.peSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.maxPEFilter = val;
            elements.peDisplay.textContent = val >= 100 ? '100+' : val.toFixed(1);
            renderStocks();
        });

        // Moat Slider
        elements.moatSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            state.minMoatFilter = val;
            elements.moatDisplay.textContent = val.toFixed(1);
            renderStocks();
        });

        // Search Input
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            renderStocks();
        });

        // Sorting
        elements.sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sortType = btn.dataset.sort;

                if (state.sortBy === sortType) {
                    // Toggle order if clicking same sort
                    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
                    const icon = btn.querySelector('i');
                    icon.className = state.sortOrder === 'asc' ? 'ph ph-sort-descending' : 'ph ph-sort-ascending';
                } else {
                    // Update sort type and reset to default for that sort (moat defaults to desc, others asc)
                    elements.sortButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    state.sortBy = sortType;

                    if (sortType === 'moat') {
                        state.sortOrder = 'desc';
                    } else {
                        state.sortOrder = 'asc';
                    }

                    // Reset icons to their default state
                    elements.sortButtons.forEach(b => {
                        if (b.dataset.sort === 'moat') {
                            b.querySelector('i').className = 'ph ph-sort-ascending';
                        } else {
                            b.querySelector('i').className = 'ph ph-sort-descending';
                        }
                    });
                }

                renderStocks();
            });
        });

        // Reset Filters
        elements.resetFilters.addEventListener('click', () => {
            state = {
                roeFilter: 'Exceptional',
                maxPEFilter: 35.0, // Default to a slightly higher P/E on reset so they see some results
                minMoatFilter: 0.0,
                searchQuery: '',
                sortBy: 'pe',
                sortOrder: 'asc'
            };

            // Sync UI
            elements.roeFilter.value = state.roeFilter;
            elements.peSlider.value = state.maxPEFilter;
            elements.peDisplay.textContent = state.maxPEFilter >= 100 ? '100+' : state.maxPEFilter.toFixed(1);
            elements.moatSlider.value = state.minMoatFilter;
            elements.moatDisplay.textContent = state.minMoatFilter.toFixed(1);
            elements.searchInput.value = '';

            elements.sortButtons.forEach(b => b.classList.remove('active'));
            elements.sortButtons[0].classList.add('active'); // Assume first is default

            renderStocks();
        });
    }

    // Filtering & Sorting Logic
    function getProcessedStocks() {
        // Filter
        let processed = allStocks.filter(stock => {
            let roeMatch = true;
            if (state.roeFilter === 'Exceptional') roeMatch = stock.roe > 25;
            else if (state.roeFilter === 'High') roeMatch = stock.roe > 15;
            else if (state.roeFilter === 'all') roeMatch = true;

            const peMatch = state.maxPEFilter >= 100 ? stock.forwardPE > 0 : (stock.forwardPE > 0 && stock.forwardPE <= state.maxPEFilter);
            const moatMatch = stock.moat ? stock.moat.overall >= state.minMoatFilter : true;
            const searchMatch = state.searchQuery === '' ? true :
                (stock.symbol.toLowerCase().includes(state.searchQuery) || stock.name.toLowerCase().includes(state.searchQuery));

            return roeMatch && peMatch && moatMatch && searchMatch;
        });

        // Sort
        processed.sort((a, b) => {
            let valA, valB;

            if (state.sortBy === 'pe') {
                valA = a.forwardPE > 0 ? a.forwardPE : 9999;
                valB = b.forwardPE > 0 ? b.forwardPE : 9999;
            } else if (state.sortBy === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (state.sortBy === 'moat') {
                valA = a.moat ? a.moat.overall : 0;
                valB = b.moat ? b.moat.overall : 0;
            }

            if (valA < valB) return state.sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return processed;
    }

    // Format Helpers
    function formatMktCap(value) {
        if (!value) return 'N/A';
        if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
        if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
        if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
        return value;
    }

    function formatFCF(value) {
        if (value === undefined || value === null) return 'N/A';
        const isNegative = value < 0;
        const absVal = Math.abs(value);
        let formatted = '';
        if (absVal >= 1e9) formatted = (absVal / 1e9).toFixed(2) + 'B';
        else if (absVal >= 1e6) formatted = (absVal / 1e6).toFixed(2) + 'M';
        else formatted = absVal.toFixed(0);

        return isNegative ? '-$' + formatted : '$' + formatted;
    }

    // Render Logic
    function renderStocks() {
        const stocksToRender = getProcessedStocks();

        elements.resultCount.textContent = `${stocksToRender.length} stock${stocksToRender.length !== 1 ? 's' : ''} found`;

        if (stocksToRender.length === 0) {
            elements.stockGrid.innerHTML = `
                <div class="loading-state">
                    <i class="ph ph-magnifying-glass" style="font-size: 48px; color: var(--text-tertiary); margin-bottom: 16px;"></i>
                    <p>No stocks match your current premium criteria.</p>
                </div>
            `;
            return;
        }

        elements.stockGrid.innerHTML = stocksToRender.map(stock => {
            let qualityClass = 'standard';
            let qualityLabel = 'Standard ROE';
            if (stock.roe > 25) { qualityClass = 'exceptional'; qualityLabel = 'Exceptional ROE'; }
            else if (stock.roe > 15) { qualityClass = 'high'; qualityLabel = 'High ROE'; }

            const peClass = stock.forwardPE < 20 ? 'great-value' : (stock.forwardPE > 30 ? 'expensive' : '');
            const isPositive = stock.change >= 0;
            const changeClass = isPositive ? 'positive' : 'negative';
            const changeIcon = isPositive ? 'ph-trend-up' : 'ph-trend-down';

            return `
                <div class="stock-card">
                    <div class="card-header">
                        <div>
                            <div class="stock-symbol">${stock.symbol}</div>
                            <div class="stock-name" title="${stock.name}">${stock.name}</div>
                        </div>
                        <span class="quality-badge ${qualityClass}">${qualityLabel}</span>
                    </div>
                    
                    <div class="card-metrics">
                        <div class="metric-box">
                            <div class="metric-label">Forward P/E</div>
                            <div class="metric-value pe-value ${peClass}">${stock.forwardPE.toFixed(1)}</div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-label">Sector</div>
                            <div class="metric-value" style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${stock.sector}">${stock.sector}</div>
                        </div>
                    </div>
                    
                    <div class="extended-metrics">
                        <div class="ext-metric">
                            <span class="ext-label">Rev Growth</span>
                            <span class="ext-value ${stock.revenueGrowth > 0 ? 'positive-text' : (stock.revenueGrowth < 0 ? 'negative-text' : '')}">${stock.revenueGrowth ? stock.revenueGrowth.toFixed(2) + '%' : 'N/A'}</span>
                        </div>
                        <div class="ext-metric">
                            <span class="ext-label">Div Yield</span>
                            <span class="ext-value">${stock.dividendYield ? stock.dividendYield.toFixed(2) + '%' : '0.00%'}</span>
                        </div>
                        <div class="ext-metric">
                            <span class="ext-label">Debt/Eq</span>
                            <span class="ext-value">${stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity.toFixed(2) : 'N/A'}</span>
                        </div>
                        <div class="ext-metric">
                            <span class="ext-label">Market Cap</span>
                            <span class="ext-value">${formatMktCap(stock.marketCap)}</span>
                        </div>
                        <div class="ext-metric">
                            <span class="ext-label">Free Cash Flow</span>
                            <span class="ext-value ${stock.freeCashflow > 0 ? 'positive-text' : (stock.freeCashflow < 0 ? 'negative-text' : '')}">${formatFCF(stock.freeCashflow)}</span>
                        </div>
                        <div class="ext-metric">
                            <span class="ext-label">Price/Book</span>
                            <span class="ext-value">${stock.priceToBook !== null && stock.priceToBook !== undefined ? stock.priceToBook.toFixed(2) : 'N/A'}</span>
                        </div>
                    </div>
                    
                    ${stock.moat ? `
                    <div class="moat-section">
                        <div class="moat-header">
                            <h4 class="moat-title">Moat Evaluation</h4>
                            <span class="moat-overall-badge">${stock.moat.overall.toFixed(1)} / 10</span>
                        </div>
                        <div class="moat-bars">
                            <div class="moat-row">
                                <span class="moat-label">Brand & Pricing</span>
                                <div class="moat-bar-container"><div class="moat-bar-fill" style="width: ${stock.moat.brandLoyalty * 10}%;"></div></div>
                                <span class="moat-score">${stock.moat.brandLoyalty.toFixed(1)}</span>
                            </div>
                            <div class="moat-row">
                                <span class="moat-label">Entry Barriers</span>
                                <div class="moat-bar-container"><div class="moat-bar-fill" style="width: ${stock.moat.barriersToEntry * 10}%;"></div></div>
                                <span class="moat-score">${stock.moat.barriersToEntry.toFixed(1)}</span>
                            </div>
                            <div class="moat-row">
                                <span class="moat-label">Switching Cost</span>
                                <div class="moat-bar-container"><div class="moat-bar-fill" style="width: ${stock.moat.switchingCost * 10}%;"></div></div>
                                <span class="moat-score">${stock.moat.switchingCost.toFixed(1)}</span>
                            </div>
                            <div class="moat-row">
                                <span class="moat-label">Network Effect</span>
                                <div class="moat-bar-container"><div class="moat-bar-fill" style="width: ${stock.moat.networkEffect * 10}%;"></div></div>
                                <span class="moat-score">${stock.moat.networkEffect.toFixed(1)}</span>
                            </div>
                            <div class="moat-row">
                                <span class="moat-label">Econ. of Scale</span>
                                <div class="moat-bar-container"><div class="moat-bar-fill" style="width: ${stock.moat.economiesOfScale * 10}%;"></div></div>
                                <span class="moat-score">${stock.moat.economiesOfScale.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="card-footer">
                        <div class="price">$${stock.price.toFixed(2)}</div>
                        <div class="change-badge ${changeClass}">
                            <i class="ph ${changeIcon}"></i>
                            ${isPositive ? '+' : ''}${stock.change.toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Start App
    init();
});
