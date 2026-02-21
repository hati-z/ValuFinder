/**
 * ValuFinder - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let allStocks = [];
    let state = {
        roeFilter: 'Exceptional', // Default to Exceptional ROE
        maxPEFilter: 25.0,
        searchQuery: '',
        sortBy: 'pe', // 'pe' or 'name'
        sortOrder: 'asc' // 'asc' or 'desc'
    };

    // DOM Elements
    const elements = {
        stockGrid: document.getElementById('stock-grid'),
        roeFilter: document.getElementById('roe-filter'),
        peSlider: document.getElementById('pe-slider'),
        peDisplay: document.getElementById('pe-value-display'),
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
            elements.peDisplay.textContent = state.maxPEFilter.toFixed(1);
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
            elements.peDisplay.textContent = val.toFixed(1);
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
                    icon.className = state.sortOrder === 'asc' ? 'ph ph-sort-ascending' : 'ph ph-sort-descending';
                } else {
                    // Update sort type and reset to asc
                    elements.sortButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    state.sortBy = sortType;
                    state.sortOrder = 'asc';

                    // Reset all icons to ascending initially, then apply to active
                    elements.sortButtons.forEach(b => {
                        b.querySelector('i').className = 'ph ph-sort-ascending';
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
                searchQuery: '',
                sortBy: 'pe',
                sortOrder: 'asc'
            };

            // Sync UI
            elements.roeFilter.value = state.roeFilter;
            elements.peSlider.value = state.maxPEFilter;
            elements.peDisplay.textContent = state.maxPEFilter.toFixed(1);
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

            const peMatch = stock.forwardPE <= state.maxPEFilter;
            const searchMatch = state.searchQuery === '' ? true :
                (stock.symbol.toLowerCase().includes(state.searchQuery) || stock.name.toLowerCase().includes(state.searchQuery));

            return roeMatch && peMatch && searchMatch;
        });

        // Sort
        processed.sort((a, b) => {
            let valA, valB;

            if (state.sortBy === 'pe') {
                valA = a.forwardPE;
                valB = b.forwardPE;
            } else if (state.sortBy === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            }

            if (valA < valB) return state.sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return processed;
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
