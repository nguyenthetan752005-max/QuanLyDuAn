let debounceTimer;

export function initStockTab() {
    const searchInput = document.getElementById('stock-search-input');
    
    if (searchInput) {
        // Initial load
        fetchStockImages("nature");
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            if (query.length > 0) {
                debounceTimer = setTimeout(() => {
                    fetchStockImages(query);
                }, 800); // 800ms debounce
            }
        });
    }
}

async function fetchStockImages(query) {
    const grid = document.getElementById('stock-grid');
    const loader = document.getElementById('stock-loader');
    
    if (!grid || !loader) return;
    
    grid.innerHTML = '';
    loader.hidden = false;
    
    try {
        const response = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}&per_page=30`);
        if (!response.ok) {
            throw new Error("Failed to fetch stock images");
        }
        
        const data = await response.json();
        const results = data.results || [];
        
        loader.hidden = true;
        
        if (results.length === 0) {
            grid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">Không tìm thấy ảnh</div>';
            return;
        }
        
        results.forEach(img => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.cursor = 'grab';
            wrapper.style.borderRadius = '4px';
            wrapper.style.overflow = 'hidden';
            wrapper.style.marginBottom = '6px';
            
            // Allow dragging onto canvas
            wrapper.draggable = true;
            wrapper.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', img.urls.regular);
                e.dataTransfer.setData('application/lily-stock', 'true');
                wrapper.style.opacity = '0.5';
            });
            wrapper.addEventListener('dragend', () => {
                wrapper.style.opacity = '1';
            });
            
            const imageEl = document.createElement('img');
            imageEl.src = img.urls.thumb;
            imageEl.style.width = '100%';
            imageEl.style.display = 'block';
            imageEl.loading = 'lazy';
            
            // Add click to insert feature
            wrapper.addEventListener('click', () => {
                // Dispatch a custom event that editor can listen to
                window.dispatchEvent(new CustomEvent('insertStockImage', { detail: { url: img.urls.regular } }));
            });
            
            wrapper.appendChild(imageEl);
            grid.appendChild(wrapper);
        });
        
    } catch (e) {
        console.error(e);
        loader.hidden = true;
        grid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: #ef4444; font-size: 12px; padding: 20px;">Lỗi tải ảnh</div>';
    }
}
