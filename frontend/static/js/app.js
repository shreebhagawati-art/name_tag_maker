// FOOD NAME TAG MAKER — Frontend Application

class FoodTagMakerApp {
    constructor() {
        this.selectedTemplate = 'day'; // 'day' | 'night'
        this.currentTab = 'list';      // 'list' | 'bulk'
        this.items = [
            { id: this.generateId(), name: 'Paneer Butter Masala', quantity: 100 }
        ];
        this.previewIndex = 0;
        this.isGenerating = false;
        this.previewDebounceTimer = null;
        this.lastGeneratedFile = null;

        this.init();
    }

    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.bindEvents();
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.fetchLivePreview();
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    bindEvents() {
        // Template Selection
        const dayCard = document.getElementById('card-template-day');
        const nightCard = document.getElementById('card-template-night');

        if (dayCard) {
            dayCard.addEventListener('click', () => this.setTemplate('day'));
        }
        if (nightCard) {
            nightCard.addEventListener('click', () => this.setTemplate('night'));
        }

        // Mode Tabs (Dish Table vs Paste Food List)
        const tabList = document.getElementById('tab-mode-list');
        const tabBulk = document.getElementById('tab-mode-bulk');
        const btnOpenBulk = document.getElementById('btn-open-bulk-modal');
        const btnCancelBulk = document.getElementById('btn-cancel-bulk');

        if (tabList) tabList.addEventListener('click', () => this.switchTab('list'));
        if (tabBulk) tabBulk.addEventListener('click', () => this.switchTab('bulk'));
        if (btnOpenBulk) btnOpenBulk.addEventListener('click', () => this.switchTab('bulk'));
        if (btnCancelBulk) btnCancelBulk.addEventListener('click', () => this.switchTab('list'));

        // Bulk Food List Inputs & Actions
        const bulkInput = document.getElementById('bulk-food-input');
        const bulkQtyInput = document.getElementById('bulk-default-qty');
        const btnApplyBulk = document.getElementById('btn-apply-bulk-list');
        const btnClearBulk = document.getElementById('btn-bulk-clear');
        const btnSampleBulk = document.getElementById('btn-load-sample-20');

        if (bulkInput) {
            bulkInput.addEventListener('input', () => this.updateBulkCount());
        }
        if (bulkQtyInput) {
            bulkQtyInput.addEventListener('input', () => this.updateBulkCount());
        }
        if (btnApplyBulk) {
            btnApplyBulk.addEventListener('click', () => this.applyBulkList());
        }
        if (btnClearBulk) {
            btnClearBulk.addEventListener('click', () => {
                if (bulkInput) bulkInput.value = '';
                this.updateBulkCount();
            });
        }
        if (btnSampleBulk) {
            btnSampleBulk.addEventListener('click', () => this.loadSampleBulkDishes());
        }

        // Set All to 1 Tag Each
        const btnSetAllOne = document.getElementById('btn-set-all-one');
        if (btnSetAllOne) {
            btnSetAllOne.addEventListener('click', () => this.setAllQuantitiesToOne());
        }

        // Clear All Dishes
        const btnClearAll = document.getElementById('btn-clear-all-dishes');
        if (btnClearAll) {
            btnClearAll.addEventListener('click', () => this.clearAllDishes());
        }

        // Add Food Button
        const addBtn = document.getElementById('btn-add-food');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addNewItem());
        }

        // Quick Preset Chips
        document.querySelectorAll('.quick-dish-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const dish = e.target.innerText.trim();
                this.addOrSetDish(dish);
            });
        });

        // Quick Sample Menu (5 dishes x 20 = 100 tags)
        const samplesBtn = document.getElementById('btn-quick-samples');
        if (samplesBtn) {
            samplesBtn.addEventListener('click', () => this.loadSampleMenu());
        }

        // Make 100 Tags of Dish #1
        const fill100Btn = document.getElementById('btn-fill-100');
        if (fill100Btn) {
            fill100Btn.addEventListener('click', () => this.fill100DishOne());
        }

        // Preview Carousel Controls
        const prevBtn = document.getElementById('btn-preview-prev');
        const nextBtn = document.getElementById('btn-preview-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigatePreview(-1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigatePreview(1));
        }

        // Generate PDF
        const genBtn = document.getElementById('btn-generate-pdf');
        if (genBtn) {
            genBtn.addEventListener('click', () => this.generatePDF());
        }

        // Reset Buttons
        const resetMain = document.getElementById('btn-reset-main');
        const resetHeader = document.getElementById('btn-header-reset');
        if (resetMain) resetMain.addEventListener('click', () => this.resetAll());
        if (resetHeader) resetHeader.addEventListener('click', () => this.resetAll());

        // Download New / Reset from download panel
        const newBtn = document.getElementById('btn-download-new');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                const panel = document.getElementById('download-panel');
                if (panel) panel.classList.add('hidden');
            });
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        const tabList = document.getElementById('tab-mode-list');
        const tabBulk = document.getElementById('tab-mode-bulk');
        const viewList = document.getElementById('view-dish-list');
        const viewBulk = document.getElementById('view-bulk-paste');

        if (tab === 'list') {
            if (tabList) {
                tabList.className = 'mode-tab active px-3 py-1.5 rounded-lg text-stone-900 bg-white shadow-2xs transition';
            }
            if (tabBulk) {
                tabBulk.className = 'mode-tab px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 transition flex items-center gap-1.5';
            }
            if (viewList) viewList.classList.remove('hidden');
            if (viewBulk) viewBulk.classList.add('hidden');
        } else {
            if (tabBulk) {
                tabBulk.className = 'mode-tab active px-3 py-1.5 rounded-lg text-stone-900 bg-white shadow-2xs transition flex items-center gap-1.5';
            }
            if (tabList) {
                tabList.className = 'mode-tab px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 transition';
            }
            if (viewList) viewList.classList.add('hidden');
            if (viewBulk) viewBulk.classList.remove('hidden');

            const bulkInput = document.getElementById('bulk-food-input');
            if (bulkInput && !bulkInput.value.trim()) {
                // Pre-fill existing dish names into textarea if any
                const existingNames = this.items.map(it => it.name.trim()).filter(Boolean);
                if (existingNames.length > 0) {
                    bulkInput.value = existingNames.join('\n');
                }
            }
            this.updateBulkCount();
            if (bulkInput) bulkInput.focus();
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    parseDishesFromText(rawText) {
        if (!rawText) return [];
        const lines = rawText.split(/\r?\n/);
        const dishes = [];

        lines.forEach(line => {
            let cleaned = line.trim();
            if (!cleaned) return;

            // Strip leading bullet points, numbers like "1.", "1)", "1 -", "•", "-", "*", "#1"
            cleaned = cleaned.replace(/^(\d+[\.\)\:\-\s]+|\#\d+[\.\)\:\-\s]*|[\•\-\*\>\–\—\▪\▫\✦\★\◆]\s*)/i, '');
            // Strip trailing comma or semicolon
            cleaned = cleaned.replace(/[,;]+$/, '').trim();

            if (cleaned.length > 0) {
                dishes.push(cleaned);
            }
        });

        return dishes;
    }

    updateBulkCount() {
        const input = document.getElementById('bulk-food-input');
        const qtyInput = document.getElementById('bulk-default-qty');
        const countBadge = document.getElementById('bulk-detected-count');

        if (!input || !countBadge) return;

        const dishes = this.parseDishesFromText(input.value);
        let qtyPerDish = parseInt(qtyInput ? qtyInput.value : 1, 10);
        if (isNaN(qtyPerDish) || qtyPerDish < 1) qtyPerDish = 1;

        const totalTags = dishes.length * qtyPerDish;

        if (dishes.length === 0) {
            countBadge.className = 'font-bold text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200';
            countBadge.innerText = '0 Dishes Detected';
        } else if (totalTags > 100) {
            countBadge.className = 'font-bold text-rose-800 bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200';
            countBadge.innerText = `${dishes.length} Dishes • ${totalTags} Tags (Max 100 allowed)`;
        } else {
            countBadge.className = 'font-bold text-gold-800 bg-gold-100 px-2.5 py-1.5 rounded-lg border border-gold-200';
            countBadge.innerText = `${dishes.length} Dishes • ${totalTags} Single Tags`;
        }
    }

    applyBulkList() {
        const input = document.getElementById('bulk-food-input');
        const qtyInput = document.getElementById('bulk-default-qty');

        if (!input) return;

        const dishes = this.parseDishesFromText(input.value);
        if (dishes.length === 0) {
            this.showToast('Please enter or paste at least one food / dish name.', 'error');
            return;
        }

        let qtyPerDish = parseInt(qtyInput ? qtyInput.value : 1, 10);
        if (isNaN(qtyPerDish) || qtyPerDish < 1) qtyPerDish = 1;

        let finalDishes = dishes;
        const maxDishesAllowed = Math.floor(100 / qtyPerDish);

        if (dishes.length > maxDishesAllowed) {
            finalDishes = dishes.slice(0, maxDishesAllowed);
            this.showToast(`Imported first ${finalDishes.length} dishes to stay within the 100-tag limit.`, 'warning');
        }

        // Convert each dish to an individual single tag item
        this.items = finalDishes.map(dish => ({
            id: this.generateId(),
            name: dish,
            quantity: qtyPerDish
        }));

        this.previewIndex = 0;
        this.switchTab('list');
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();

        const totalTags = this.getTotalQuantity();
        this.showToast(`Created ${this.items.length} dishes (${totalTags} printable tags in PDF)`, 'success');
    }

    loadSampleBulkDishes() {
        const sampleDishes = [
            "Paneer Butter Masala",
            "Dal Makhani",
            "Shahi Paneer",
            "Mix Vegetable Curry",
            "Jeera Rice",
            "Gulab Jamun",
            "Hyderabadi Veg Biryani",
            "Chole Masala",
            "Malai Kofta",
            "Kashmiri Pulao"
        ];
        const input = document.getElementById('bulk-food-input');
        if (input) {
            input.value = sampleDishes.join('\n');
            this.updateBulkCount();
        }
    }

    setAllQuantitiesToOne() {
        if (!this.items.length) return;
        this.items.forEach(it => {
            it.quantity = 1;
        });
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.showToast(`Set all ${this.items.length} dishes to 1 single tag each.`, 'info');
    }

    clearAllDishes() {
        this.items = [
            { id: this.generateId(), name: '', quantity: 1 }
        ];
        this.previewIndex = 0;
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();
        this.showToast('Cleared all food items.', 'info');
    }

    setTemplate(template) {
        if (this.selectedTemplate === template) return;
        this.selectedTemplate = template;

        const dayCard = document.getElementById('card-template-day');
        const nightCard = document.getElementById('card-template-night');

        if (template === 'day') {
            dayCard.classList.add('active');
            nightCard.classList.remove('active');
        } else {
            nightCard.classList.add('active');
            dayCard.classList.remove('active');
        }

        this.updateSummary();
        this.fetchLivePreview();
        this.showToast(`Selected ${template.toUpperCase()} Food template`, 'info');
    }

    renderFoodItems() {
        const list = document.getElementById('food-items-list');
        if (!list) return;

        list.innerHTML = '';
        const total = this.getTotalQuantity();

        this.items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = `food-item-row bg-stone-50/80 border rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in ${
                index === this.previewIndex ? 'border-gold-400 bg-gold-50/40 ring-1 ring-gold-400/30' : 'border-stone-200'
            }`;

            // Left: Dish Number & Name Input
            const leftCol = document.createElement('div');
            leftCol.className = 'flex items-center gap-3 flex-1 w-full';

            const numBadge = document.createElement('span');
            numBadge.className = 'w-6 h-6 rounded-full bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0';
            numBadge.innerText = `${index + 1}`;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 shadow-2xs uppercase';
            input.placeholder = `e.g. Dish ${index + 1} Name`;
            input.value = item.name;
            input.addEventListener('input', (e) => {
                this.items[index].name = e.target.value;
                this.previewIndex = index;
                this.updatePreviewCarousel();
                this.updateSummary();
                this.scheduleLivePreview();
            });
            input.addEventListener('focus', () => {
                if (this.previewIndex !== index) {
                    this.previewIndex = index;
                    this.renderFoodItems();
                    this.updatePreviewCarousel();
                    this.fetchLivePreview();
                }
            });

            leftCol.appendChild(numBadge);
            leftCol.appendChild(input);

            // Right: Quantity Controls & Delete
            const rightCol = document.createElement('div');
            rightCol.className = 'flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0';

            // Quantity stepper
            const stepper = document.createElement('div');
            stepper.className = 'flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden shadow-2xs';

            const minusBtn = document.createElement('button');
            minusBtn.type = 'button';
            minusBtn.className = 'px-2.5 py-1.5 text-stone-600 hover:bg-stone-100 font-bold transition text-xs';
            minusBtn.innerText = '−';
            minusBtn.addEventListener('click', () => {
                if (item.quantity > 1) {
                    this.setQuantity(index, item.quantity - 1);
                }
            });

            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.min = '1';
            qtyInput.max = '100';
            qtyInput.className = 'w-14 text-center text-xs font-bold text-stone-800 focus:outline-none py-1.5';
            qtyInput.value = item.quantity;
            qtyInput.addEventListener('change', (e) => {
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                this.setQuantity(index, val);
            });

            const plusBtn = document.createElement('button');
            plusBtn.type = 'button';
            plusBtn.className = 'px-2.5 py-1.5 text-stone-600 hover:bg-stone-100 font-bold transition text-xs';
            plusBtn.innerText = '+';
            plusBtn.addEventListener('click', () => {
                const currentTotal = this.getTotalQuantity();
                if (currentTotal < 100) {
                    this.setQuantity(index, item.quantity + 1);
                } else {
                    this.showToast('Maximum 100 tags reached', 'warning');
                }
            });

            stepper.appendChild(minusBtn);
            stepper.appendChild(qtyInput);
            stepper.appendChild(plusBtn);

            // Presets pills (1, 10, 25, 50, 100)
            const presetContainer = document.createElement('div');
            presetContainer.className = 'hidden md:flex items-center gap-1';

            [1, 10, 25, 50].forEach(preset => {
                const pBtn = document.createElement('button');
                pBtn.type = 'button';
                pBtn.className = `preset-btn px-2 py-1 rounded text-[11px] font-semibold border ${
                    item.quantity === preset
                        ? 'bg-maroon-900 text-white border-maroon-900'
                        : 'bg-white text-stone-600 border-stone-200'
                }`;
                pBtn.innerText = preset;
                pBtn.addEventListener('click', () => this.setQuantity(index, preset));
                presetContainer.appendChild(pBtn);
            });

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = `p-2 rounded-lg transition ${
                this.items.length === 1
                    ? 'text-stone-300 cursor-not-allowed'
                    : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50'
            }`;
            deleteBtn.title = 'Remove Dish';
            deleteBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
            if (this.items.length > 1) {
                deleteBtn.addEventListener('click', () => this.deleteItem(index));
            }

            rightCol.appendChild(stepper);
            rightCol.appendChild(presetContainer);
            rightCol.appendChild(deleteBtn);

            row.appendChild(leftCol);
            row.appendChild(rightCol);
            list.appendChild(row);
        });

        // Update items count label
        const countLabel = document.getElementById('items-count-label');
        if (countLabel) {
            countLabel.innerText = `${this.items.length} ${this.items.length === 1 ? 'dish' : 'dishes'}`;
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    addNewItem(name = '', quantity = null) {
        const currentTotal = this.getTotalQuantity();
        if (currentTotal >= 100) {
            this.showToast('Maximum 100 name tags limit reached.', 'warning');
            return;
        }

        const remaining = 100 - currentTotal;
        const defaultQty = quantity !== null ? quantity : Math.min(1, remaining);

        this.items.push({
            id: this.generateId(),
            name: name,
            quantity: defaultQty
        });

        this.previewIndex = this.items.length - 1;
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();

        // Focus the newly added input
        setTimeout(() => {
            const inputs = document.querySelectorAll('#food-items-list input[type=text]');
            if (inputs.length) {
                inputs[inputs.length - 1].focus();
            }
        }, 50);
    }

    addOrSetDish(dishName) {
        // If last item is empty, use it; otherwise add new
        const last = this.items[this.items.length - 1];
        if (last && !last.name.trim()) {
            last.name = dishName;
            this.renderFoodItems();
            this.updateSummary();
            this.fetchLivePreview();
        } else {
            this.addNewItem(dishName, 1);
        }
    }

    deleteItem(index) {
        if (this.items.length <= 1) return;
        this.items.splice(index, 1);
        if (this.previewIndex >= this.items.length) {
            this.previewIndex = Math.max(0, this.items.length - 1);
        }
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();
    }

    setQuantity(index, desiredQty) {
        let otherTotal = 0;
        this.items.forEach((it, i) => {
            if (i !== index) otherTotal += it.quantity;
        });

        const maxAllowedForThis = Math.max(1, 100 - otherTotal);
        const finalQty = Math.min(Math.max(1, desiredQty), maxAllowedForThis);

        this.items[index].quantity = finalQty;
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();

        if (desiredQty > maxAllowedForThis) {
            this.showToast(`Adjusted to ${finalQty} to stay within the 100-tag limit.`, 'warning');
        }
    }

    fill100DishOne() {
        if (!this.items.length) return;
        const first = this.items[0];
        this.items = [{
            id: first.id,
            name: first.name || 'Paneer Butter Masala',
            quantity: 100
        }];
        this.previewIndex = 0;
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();
        this.showToast('Configured 100 identical tags for Dish #1', 'success');
    }

    loadSampleMenu() {
        this.items = [
            { id: this.generateId(), name: 'Paneer Butter Masala', quantity: 20 },
            { id: this.generateId(), name: 'Dal Makhani', quantity: 20 },
            { id: this.generateId(), name: 'Mix Vegetable Curry', quantity: 20 },
            { id: this.generateId(), name: 'Jeera Rice', quantity: 20 },
            { id: this.generateId(), name: 'Gulab Jamun', quantity: 20 },
        ];
        this.previewIndex = 0;
        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();
        this.showToast('Loaded 5 sample wedding dishes (100 tags total)', 'success');
    }

    getTotalQuantity() {
        return this.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    }

    updateTotalCounter() {
        const total = this.getTotalQuantity();
        const badge = document.getElementById('counter-total-badge');
        const statusText = document.getElementById('counter-status-text');
        const capBadge = document.getElementById('counter-badge');
        const pctText = document.getElementById('progress-percentage');
        const barFill = document.getElementById('progress-bar-fill');
        const addBtn = document.getElementById('btn-add-food');

        if (badge) badge.innerText = total;
        if (statusText) statusText.innerText = `${total} / 100 Tags`;
        if (pctText) pctText.innerText = `${total}%`;
        if (barFill) barFill.style.width = `${total}%`;

        if (total >= 100) {
            if (capBadge) {
                capBadge.className = 'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800';
                capBadge.innerText = '100 / 100 (Limit)';
            }
            if (addBtn) addBtn.disabled = true;
        } else {
            if (capBadge) {
                capBadge.className = 'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800';
                capBadge.innerText = `${100 - total} Available`;
            }
            if (addBtn) addBtn.disabled = false;
        }
    }

    updateSummary() {
        const total = this.getTotalQuantity();
        const templateLabel = this.selectedTemplate === 'day' ? 'Day Food' : 'Night Food';

        const sTemplate = document.getElementById('summary-template');
        const sItems = document.getElementById('summary-items');
        const sTags = document.getElementById('summary-total-tags');

        if (sTemplate) sTemplate.innerText = templateLabel;
        if (sItems) sItems.innerText = `${this.items.length} ${this.items.length === 1 ? 'Dish' : 'Dishes'}`;
        if (sTags) sTags.innerText = `${total} ${total === 1 ? 'Page' : 'Pages'}`;
    }

    updatePreviewCarousel() {
        const nav = document.getElementById('preview-carousel-nav');
        const label = document.getElementById('preview-carousel-label');

        if (!nav) return;

        if (this.items.length > 1) {
            nav.classList.remove('hidden');
            const curItem = this.items[this.previewIndex] || this.items[0];
            const name = curItem.name.trim() || `Dish ${this.previewIndex + 1}`;
            if (label) {
                label.innerText = `Dish ${this.previewIndex + 1} of ${this.items.length}: ${name} (${curItem.quantity} Tags)`;
            }
        } else {
            nav.classList.add('hidden');
        }
    }

    navigatePreview(direction) {
        if (this.items.length <= 1) return;
        this.previewIndex = (this.previewIndex + direction + this.items.length) % this.items.length;
        this.renderFoodItems();
        this.updatePreviewCarousel();
        this.fetchLivePreview();
    }

    scheduleLivePreview() {
        clearTimeout(this.previewDebounceTimer);
        this.previewDebounceTimer = setTimeout(() => {
            this.fetchLivePreview();
        }, 250);
    }

    async fetchLivePreview() {
        const activeItem = this.items[this.previewIndex] || this.items[0];
        const foodName = activeItem ? (activeItem.name.trim() || 'PANEER BUTTER MASALA') : 'PANEER BUTTER MASALA';

        const loader = document.getElementById('preview-loader');
        const previewImg = document.getElementById('preview-img');
        const fontInfo = document.getElementById('preview-font-info');
        const layoutInfo = document.getElementById('preview-layout-info');

        if (loader) loader.classList.remove('hidden');

        try {
            const resp = await fetch('/api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: this.selectedTemplate,
                    food_name: foodName
                })
            });

            if (!resp.ok) {
                throw new Error('Preview request failed');
            }

            const data = await resp.json();
            if (previewImg) {
                previewImg.src = data.image_base64;
            }
            if (fontInfo) {
                fontInfo.innerText = `Fraunces ${data.font_size_used}pt`;
            }
            if (layoutInfo) {
                layoutInfo.innerText = data.lines_count === 1 ? 'Single Line (Centered)' : '2 Lines (Balanced)';
            }
        } catch (err) {
            console.error('Preview error:', err);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    async generatePDF() {
        if (this.isGenerating) return;

        // Validation
        const emptyItems = this.items.filter(it => !it.name.trim());
        if (emptyItems.length > 0) {
            this.showToast('Please enter a food name for all items.', 'error');
            return;
        }

        const total = this.getTotalQuantity();
        if (total <= 0) {
            this.showToast('Please specify a valid tag quantity.', 'error');
            return;
        }

        if (total > 100) {
            this.showToast('Maximum 100 name tags allowed per generation.', 'error');
            return;
        }

        this.isGenerating = true;
        const genBtn = document.getElementById('btn-generate-pdf');
        const genText = document.getElementById('btn-generate-text');

        if (genBtn) genBtn.disabled = true;
        if (genText) genText.innerText = 'GENERATING PDF...';

        try {
            const resp = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: this.selectedTemplate,
                    items: this.items.map(it => ({
                        name: it.name.trim(),
                        quantity: it.quantity
                    }))
                })
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to generate PDF.');
            }

            const data = await resp.json();
            this.lastGeneratedFile = data;

            // Show download panel
            const panel = document.getElementById('download-panel');
            const dlTitle = document.getElementById('download-title');
            const dlSub = document.getElementById('download-subtitle');
            const dlLink = document.getElementById('btn-download-pdf');

            if (dlTitle) dlTitle.innerText = `${data.total_pages} Name Tags Generated!`;
            if (dlSub) dlSub.innerText = `${data.filename} (${data.total_pages} printable 6 × 4 in pages)`;
            if (dlLink) {
                dlLink.href = `/api/download/${data.file_id}?name=${encodeURIComponent(data.filename)}`;
                dlLink.setAttribute('download', data.filename);
            }
            if (panel) {
                panel.classList.remove('hidden');
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            this.showToast(data.message, 'success');
        } catch (err) {
            console.error('Generation failed:', err);
            this.showToast(err.message || 'Something went wrong while generating your PDF. Please check your food names and try again.', 'error');
        } finally {
            this.isGenerating = false;
            if (genBtn) genBtn.disabled = false;
            if (genText) genText.innerText = 'GENERATE PDF';
        }
    }

    resetAll() {
        this.selectedTemplate = 'day';
        this.items = [
            { id: this.generateId(), name: 'Paneer Butter Masala', quantity: 100 }
        ];
        this.previewIndex = 0;
        this.switchTab('list');

        const dayCard = document.getElementById('card-template-day');
        const nightCard = document.getElementById('card-template-night');
        if (dayCard) dayCard.classList.add('active');
        if (nightCard) nightCard.classList.remove('active');

        const panel = document.getElementById('download-panel');
        if (panel) panel.classList.add('hidden');

        const bulkInput = document.getElementById('bulk-food-input');
        if (bulkInput) bulkInput.value = '';

        this.renderFoodItems();
        this.updateTotalCounter();
        this.updateSummary();
        this.updatePreviewCarousel();
        this.fetchLivePreview();

        this.showToast('Application reset to initial state.', 'info');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        let bgClass = 'bg-stone-900 text-white border-stone-800';
        let icon = 'info';

        if (type === 'success') {
            bgClass = 'bg-emerald-800 text-white border-emerald-700';
            icon = 'check-circle';
        } else if (type === 'warning') {
            bgClass = 'bg-amber-800 text-white border-amber-700';
            icon = 'alert-triangle';
        } else if (type === 'error') {
            bgClass = 'bg-rose-900 text-white border-rose-800';
            icon = 'alert-circle';
        }

        toast.className = `toast px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 max-w-sm ${bgClass}`;
        toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i><span>${message}</span>`;

        container.appendChild(toast);
        if (window.lucide) {
            window.lucide.createIcons();
        }

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FoodTagMakerApp();
});
