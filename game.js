class Match3Game {
    constructor() {
        this.boardRows = 7;
        this.boardCols = 8;
        this.numGemTypes = 6;
        this.board = [];
        this.selectedCell = null;
        this.score = 0;
        this.totalScore = 0;
        this.moves = 30;
        this.level = 1;
        this.levelTargetScore = 1000;
        this.isProcessing = false;
        this.dragStartCell = null;
        this.isDragging = false;
        this.visualSwapActive = false;
        this.visualSwapTarget = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.currentOffsetX = 0;
        this.currentOffsetY = 0;
        this.animationFrameId = null;
        this.buttonClickCooldown = false;
        
        // Load best stats from localStorage
        this.bestLevel = parseInt(localStorage.getItem('bestLevel') || '1');
        this.bestScore = parseInt(localStorage.getItem('bestScore') || '0');
        
        // Initialize sound system
        this.soundManager = new SoundManager();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showHome();
    }
    
    showHome() {
        document.getElementById('home-page').classList.remove('hidden');
        const gameHeader = document.querySelector('.game-header');
        const gameBoard = document.getElementById('game-board');
        const gameControls = document.querySelector('.game-controls');
        
        if (gameHeader) gameHeader.classList.add('hidden');
        if (gameBoard) gameBoard.classList.add('hidden');
        if (gameControls) {
            gameControls.classList.add('hidden');
            gameControls.style.visibility = 'hidden';
        }
        
        // Stop background music when going home
        if (this.soundManager) {
            this.soundManager.stopBackgroundMusic();
        }
        
        this.updateHomeStats();
    }
    
    showGame() {
        document.getElementById('home-page').classList.add('hidden');
        const gameHeader = document.querySelector('.game-header');
        const gameBoard = document.getElementById('game-board');
        const gameControls = document.querySelector('.game-controls');
        
        if (gameHeader) gameHeader.classList.remove('hidden');
        if (gameBoard) gameBoard.classList.remove('hidden');
        if (gameControls) {
            gameControls.classList.remove('hidden');
            gameControls.style.visibility = 'visible';
            gameControls.style.display = 'flex';
            gameControls.style.opacity = '1';
        }
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        
        // Start background music
        if (this.soundManager) {
            this.soundManager.startBackgroundMusic();
            this.soundManager.updateMusicButton();
        }
    }
    
    updateHomeStats() {
        document.getElementById('best-level').textContent = this.bestLevel;
        document.getElementById('best-score').textContent = this.bestScore.toLocaleString();
    }
    
    saveBestStats() {
        let updated = false;
        if (this.level > this.bestLevel) {
            this.bestLevel = this.level;
            localStorage.setItem('bestLevel', this.bestLevel.toString());
            updated = true;
        }
        if (this.totalScore > this.bestScore) {
            this.bestScore = this.totalScore;
            localStorage.setItem('bestScore', this.bestScore.toString());
            updated = true;
        }
        // Update home stats display if we're on home page
        if (updated && !document.querySelector('.game-header').classList.contains('hidden')) {
            // Will update when going to home
        }
    }
    
    createBoard() {
        // Initialize empty board
        this.board = [];
        for (let row = 0; row < this.boardRows; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardCols; col++) {
                this.board[row][col] = this.getRandomGem();
            }
        }
        
        // Remove initial matches
        while (this.findMatches().length > 0) {
            for (let row = 0; row < this.boardRows; row++) {
                for (let col = 0; col < this.boardCols; col++) {
                    if (this.isPartOfMatch(row, col)) {
                        this.board[row][col] = this.getRandomGem();
                    }
                }
            }
        }
    }
    
    getRandomGem() {
        return Math.floor(Math.random() * this.numGemTypes);
    }
    
    isPartOfMatch(row, col) {
        const gem = this.board[row][col];
        
        // Check horizontal match
        let horizontalCount = 1;
        for (let c = col - 1; c >= 0 && this.board[row][c] === gem; c--) horizontalCount++;
        for (let c = col + 1; c < this.boardCols && this.board[row][c] === gem; c++) horizontalCount++;
        if (horizontalCount >= 3) return true;
        
        // Check vertical match
        let verticalCount = 1;
        for (let r = row - 1; r >= 0 && this.board[r][col] === gem; r--) verticalCount++;
        for (let r = row + 1; r < this.boardRows && this.board[r][col] === gem; r++) verticalCount++;
        if (verticalCount >= 3) return true;
        
        return false;
    }
    
    renderBoard() {
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < this.boardRows; row++) {
            for (let col = 0; col < this.boardCols; col++) {
                const cell = document.createElement('div');
                cell.className = `cell gem-${this.board[row][col]}`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.textContent = this.getGemEmoji(this.board[row][col]);
                
                // Click handler (fallback)
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                
                // Drag handlers
                cell.addEventListener('mousedown', (e) => this.handleDragStart(e, row, col));
                cell.addEventListener('mouseenter', (e) => this.handleDragOver(e, row, col));
                
                // Prevent text selection during drag
                cell.addEventListener('selectstart', (e) => e.preventDefault());
                cell.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent default drag
                
                boardElement.appendChild(cell);
            }
        }
        
        // Add board-level mousemove for better drag tracking
        boardElement.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.dragStartCell) {
                // Update mouse position for smooth tracking
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
                
                const startCell = document.querySelector(
                    `[data-row="${this.dragStartCell.row}"][data-col="${this.dragStartCell.col}"]`
                );
                if (startCell) {
                    const rect = startCell.getBoundingClientRect();
                    // Calculate target offset (where we want to go)
                    this.targetOffsetX = (e.clientX - (rect.left + rect.width / 2)) * 0.6;
                    this.targetOffsetY = (e.clientY - (rect.top + rect.height / 2)) * 0.6;
                    this.dragOffsetX = this.targetOffsetX;
                    this.dragOffsetY = this.targetOffsetY;
                }
                
                const cell = e.target.closest('.cell');
                if (cell && cell.dataset.row && cell.dataset.col) {
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    this.handleDragOver(e, row, col);
                }
            }
        });
        
        // Add global mouse up handler to handle drag end
        document.addEventListener('mouseup', () => this.handleDragEnd());
    }
    
    getGemEmoji(gemType) {
        const emojis = ['🔴', '🔵', '🟡', '🟢', '🟠', '🟣'];
        return emojis[gemType] || '⚪';
    }
    
    handleDragStart(e, row, col) {
        if (this.isProcessing) return;
        if (this.moves <= 0) return; // No moves left
        
        e.preventDefault();
        this.dragStartCell = { row, col };
        this.isDragging = true;
        
        // Play swipe sound
        if (this.soundManager) {
            this.soundManager.playSwipeSound();
        }
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            const boardRect = document.getElementById('game-board').getBoundingClientRect();
            
            // Store initial mouse position relative to cell center
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.targetOffsetX = 0;
            this.targetOffsetY = 0;
            this.currentOffsetX = 0;
            this.currentOffsetY = 0;
            
            cell.classList.add('selected', 'dragging');
            cell.style.cursor = 'grabbing';
            cell.style.transition = 'none'; // Disable transition during drag for smooth following
            cell.style.willChange = 'transform';
            
            // Start smooth position tracking
            this.startDragTracking();
        }
        
        // Add dragging class to board for visual feedback
        document.getElementById('game-board').classList.add('is-dragging');
    }
    
    startDragTracking() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        const updateDragPosition = () => {
            if (!this.isDragging || !this.dragStartCell) return;
            
            const cell = document.querySelector(
                `[data-row="${this.dragStartCell.row}"][data-col="${this.dragStartCell.col}"]`
            );
            
            if (cell) {
                // Smooth interpolation using easing (ease-out cubic for fluid motion)
                const smoothingFactor = 0.15; // Lower = smoother but slower response
                this.currentOffsetX += (this.targetOffsetX - this.currentOffsetX) * smoothingFactor;
                this.currentOffsetY += (this.targetOffsetY - this.currentOffsetY) * smoothingFactor;
                
                // Apply smooth transform with fluid motion
                const scale = 1.12 + Math.min(Math.abs(this.currentOffsetX) + Math.abs(this.currentOffsetY), 30) / 200;
                const rotationX = this.currentOffsetY * 0.1;
                const rotationY = this.currentOffsetX * 0.1;
                
                cell.style.transform = `translate(${this.currentOffsetX}px, ${this.currentOffsetY}px) scale(${scale}) translateZ(20px) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
            }
            
            this.animationFrameId = requestAnimationFrame(updateDragPosition);
        };
        
        this.animationFrameId = requestAnimationFrame(updateDragPosition);
    }
    
    handleDragOver(e, row, col) {
        if (!this.isDragging || !this.dragStartCell) return;
        if (this.isProcessing) return;
        
        e.preventDefault();
        
        // Don't update if hovering over the same cell
        if (row === this.dragStartCell.row && col === this.dragStartCell.col) return;
        
        // Check if target is adjacent
        const isAdjacent = 
            (Math.abs(this.dragStartCell.row - row) === 1 && this.dragStartCell.col === col) ||
            (Math.abs(this.dragStartCell.col - col) === 1 && this.dragStartCell.row === row);
        
        const startCell = document.querySelector(
            `[data-row="${this.dragStartCell.row}"][data-col="${this.dragStartCell.col}"]`
        );
        
        // If we have a visual swap active but target changed, revert it
        if (this.visualSwapActive && this.visualSwapTarget) {
            if (this.visualSwapTarget.row !== row || this.visualSwapTarget.col !== col) {
                this.revertVisualSwap();
            }
        }
        
        if (isAdjacent) {
            const targetCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            
            // If this is a new target or we don't have a visual swap, create one
            if (!this.visualSwapActive || 
                !this.visualSwapTarget || 
                this.visualSwapTarget.row !== row || 
                this.visualSwapTarget.col !== col) {
                
                // Revert any existing swap first
                if (this.visualSwapActive) {
                    this.revertVisualSwap();
                }
                
                // Perform visual swap
                this.performVisualSwap(this.dragStartCell.row, this.dragStartCell.col, row, col);
                this.visualSwapTarget = { row, col };
            }
            
            if (targetCell) {
                targetCell.classList.add('drag-target');
                if (startCell) {
                    this.drawConnectionLine(startCell, targetCell);
                }
            }
        } else {
            // Not adjacent - revert visual swap if active
            if (this.visualSwapActive) {
                this.revertVisualSwap();
            }
            
            // Remove target from all cells
            document.querySelectorAll('.cell').forEach(c => {
                c.classList.remove('drag-target');
            });
            
            // Remove connection line if not adjacent
            this.removeConnectionLine();
        }
    }
    
    performVisualSwap(row1, col1, row2, col2) {
        const cell1 = document.querySelector(`[data-row="${row1}"][data-col="${col1}"]`);
        const cell2 = document.querySelector(`[data-row="${row2}"][data-col="${col2}"]`);
        
        if (!cell1 || !cell2) return;
        
        // Get cell positions for smooth swap animation
        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();
        
        // Calculate relative positions in pixels for smoother animation
        const deltaX = rect2.left - rect1.left;
        const deltaY = rect2.top - rect1.top;
        
        // Actually swap in the board array so match checking works correctly
        [this.board[row1][col1], this.board[row2][col2]] = 
        [this.board[row2][col2], this.board[row1][col1]];
        
        // Get the gem types (now swapped)
        const gem1 = this.board[row1][col1];
        const gem2 = this.board[row2][col2];
        
        // Enable ultra-smooth transitions for swap animation
        cell1.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        cell2.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        // Animate swap with fluid position interpolation
        cell1.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.08) translateZ(15px)`;
        cell2.style.transform = `translate(${-deltaX}px, ${-deltaY}px) scale(1.08) translateZ(15px)`;
        
        // Update the visual appearance mid-animation for seamless transition
        setTimeout(() => {
            cell1.className = `cell gem-${gem1}`;
            cell1.textContent = this.getGemEmoji(gem1);
            cell1.classList.add('selected', 'dragging');
            
            cell2.className = `cell gem-${gem2}`;
            cell2.textContent = this.getGemEmoji(gem2);
            cell2.classList.add('drag-target');
        }, 175); // Halfway through animation for smooth visual swap
        
        // Reset transforms after animation completes
        setTimeout(() => {
            cell1.style.transform = '';
            cell2.style.transform = '';
        }, 350);
        
        this.visualSwapActive = true;
    }
    
    revertVisualSwap() {
        if (!this.visualSwapActive || !this.dragStartCell || !this.visualSwapTarget) return;
        
        const cell1 = document.querySelector(
            `[data-row="${this.dragStartCell.row}"][data-col="${this.dragStartCell.col}"]`
        );
        const cell2 = document.querySelector(
            `[data-row="${this.visualSwapTarget.row}"][data-col="${this.visualSwapTarget.col}"]`
        );
        
        if (cell1 && cell2) {
            // Smooth revert animation
            cell1.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            cell2.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            // Animate back to original positions
            cell1.style.transform = 'translate(0, 0) scale(1.1) translateZ(15px)';
            cell2.style.transform = 'translate(0, 0) scale(1.1) translateZ(15px)';
            
            // Revert the board array swap after animation
            setTimeout(() => {
                [this.board[this.dragStartCell.row][this.dragStartCell.col], 
                 this.board[this.visualSwapTarget.row][this.visualSwapTarget.col]] = 
                [this.board[this.visualSwapTarget.row][this.visualSwapTarget.col], 
                 this.board[this.dragStartCell.row][this.dragStartCell.col]];
                
                // Restore original appearance
                const gem1 = this.board[this.dragStartCell.row][this.dragStartCell.col];
                const gem2 = this.board[this.visualSwapTarget.row][this.visualSwapTarget.col];
                
                cell1.className = `cell gem-${gem1}`;
                cell1.textContent = this.getGemEmoji(gem1);
                cell1.classList.add('selected', 'dragging');
                cell1.style.transform = '';
                
                cell2.className = `cell gem-${gem2}`;
                cell2.textContent = this.getGemEmoji(gem2);
                cell2.style.transform = '';
            }, 300);
        }
        
        this.visualSwapActive = false;
        this.visualSwapTarget = null;
    }
    
    drawConnectionLine(startCell, targetCell) {
        // Remove existing line
        this.removeConnectionLine();
        
        const board = document.getElementById('game-board');
        const startRect = startCell.getBoundingClientRect();
        const targetRect = targetCell.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        
        // Calculate positions relative to board
        const startX = startRect.left + startRect.width / 2 - boardRect.left;
        const startY = startRect.top + startRect.height / 2 - boardRect.top;
        const targetX = targetRect.left + targetRect.width / 2 - boardRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - boardRect.top;
        
        // Create SVG line
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'drag-connection');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', targetX);
        line.setAttribute('y2', targetY);
        line.setAttribute('stroke', 'rgba(100, 150, 255, 0.9)');
        line.setAttribute('stroke-width', '5');
        line.setAttribute('stroke-dasharray', '8, 4');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        // Add arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', 'rgba(100, 150, 255, 0.9)');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        svg.appendChild(line);
        
        board.style.position = 'relative';
        board.appendChild(svg);
    }
    
    removeConnectionLine() {
        const existingLine = document.querySelector('.drag-connection');
        if (existingLine) {
            existingLine.remove();
        }
    }
    
    handleDragEnd() {
        if (!this.isDragging || !this.dragStartCell) return;
        
        // If we have a visual swap active, commit it to the game logic
        if (this.visualSwapActive && this.visualSwapTarget) {
            // The board array is already swapped from performVisualSwap
            // Just check for matches and process
            const matches = this.findMatches();
            
            if (matches.length > 0) {
                // Valid swap
                this.selectedCell = null;
                this.updateCellSelection();
                if (this.moves > 0) this.moves--;
                
                // Animate matched cells by enlarging them
                this.animateMatchedCells(matches).then(() => {
                    this.processMatches();
                });
            } else {
                // Invalid swap - revert
                this.revertVisualSwap();
                this.renderBoard();
            }
            
            // Clear visual swap state
            this.visualSwapActive = false;
            this.visualSwapTarget = null;
        } else {
            // No visual swap was active, check if there's a target cell
            const targetCell = document.querySelector('.drag-target');
            if (targetCell) {
                const targetRow = parseInt(targetCell.dataset.row);
                const targetCol = parseInt(targetCell.dataset.col);
                
                this.swapCells(
                    this.dragStartCell.row,
                    this.dragStartCell.col,
                    targetRow,
                    targetCol
                );
            } else {
                // No valid target - just clean up
                if (this.visualSwapActive) {
                    this.revertVisualSwap();
                }
            }
        }
        
        // Remove connection line
        this.removeConnectionLine();
        
        // Reset drag state
        this.dragStartCell = null;
        this.isDragging = false;
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Smoothly reset all drag-related styles with fluid motion
        document.querySelectorAll('.cell').forEach(c => {
            c.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
            c.style.transform = '';
            c.style.willChange = '';
            c.classList.remove('selected', 'drag-target', 'dragging');
            c.style.cursor = '';
            
            // Reset offsets
            this.currentOffsetX = 0;
            this.currentOffsetY = 0;
            this.targetOffsetX = 0;
            this.targetOffsetY = 0;
            
            // Remove inline styles after transition
            setTimeout(() => {
                c.style.transition = '';
            }, 400);
        });
        
        // Remove board dragging class
        document.getElementById('game-board').classList.remove('is-dragging');
    }
    
    handleCellClick(row, col) {
        // Clicking only allows visual selection, no matching allowed
        // Matching is only allowed through drag and drop
        if (this.isProcessing) return;
        if (this.isDragging) return; // Ignore clicks during drag
        
        // Just allow visual selection for feedback, but don't perform swaps
        this.selectedCell = { row, col };
        this.updateCellSelection();
    }
    
    updateCellSelection() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('selected'));
        
        if (this.selectedCell) {
            const cell = document.querySelector(
                `[data-row="${this.selectedCell.row}"][data-col="${this.selectedCell.col}"]`
            );
            if (cell) cell.classList.add('selected');
        }
    }
    
    swapCells(row1, col1, row2, col2) {
        // If visual swap is already active, the board array is already swapped
        // Otherwise, swap it now
        if (!this.visualSwapActive) {
            // Swap in board
            [this.board[row1][col1], this.board[row2][col2]] = 
            [this.board[row2][col2], this.board[row1][col1]];
        }
        
        // Check if swap creates a match
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // Valid swap - visual swap already shows the correct state (or we just swapped)
            this.selectedCell = null;
            this.updateCellSelection();
            if (this.moves > 0) this.moves--;
            
            // Play match sound
            if (this.soundManager) {
                this.soundManager.playMatchSound(matches.length);
            }
            
            // Animate matched cells by enlarging them
            this.animateMatchedCells(matches).then(() => {
                this.processMatches();
            });
        } else {
            // Invalid swap - revert both visual and logical
            if (this.visualSwapActive) {
                // Visual swap will be reverted by renderBoard, but we need to revert the array
                [this.board[row1][col1], this.board[row2][col2]] = 
                [this.board[row2][col2], this.board[row1][col1]];
            } else {
                // Revert the swap we just made
                [this.board[row1][col1], this.board[row2][col2]] = 
                [this.board[row2][col2], this.board[row1][col1]];
            }
            this.renderBoard();
        }
    }
    
    async animateMatchedCells(matches) {
        // Add enlarge class to all matched cells
        matches.forEach(match => {
            const cell = document.querySelector(
                `[data-row="${match.row}"][data-col="${match.col}"]`
            );
            if (cell) {
                cell.classList.add('match-enlarge');
            }
        });
        
        // Wait for the enlargement animation to complete
        await this.sleep(400);
        
        // Remove the enlarge class
        matches.forEach(match => {
            const cell = document.querySelector(
                `[data-row="${match.row}"][data-col="${match.col}"]`
            );
            if (cell) {
                cell.classList.remove('match-enlarge');
            }
        });
    }
    
    findMatches() {
        const matches = [];
        const visited = new Set();
        
        // Check horizontal matches
        for (let row = 0; row < this.boardRows; row++) {
            let count = 1;
            let currentGem = this.board[row][0];
            
            for (let col = 1; col < this.boardCols; col++) {
                if (this.board[row][col] === currentGem) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let c = col - count; c < col; c++) {
                            const key = `${row},${c}`;
                            if (!visited.has(key)) {
                                matches.push({ row, col: c });
                                visited.add(key);
                            }
                        }
                    }
                    count = 1;
                    currentGem = this.board[row][col];
                }
            }
            
            // Check end of row
            if (count >= 3) {
                for (let c = this.boardCols - count; c < this.boardCols; c++) {
                    const key = `${row},${c}`;
                    if (!visited.has(key)) {
                        matches.push({ row, col: c });
                        visited.add(key);
                    }
                }
            }
        }
        
        // Check vertical matches
        for (let col = 0; col < this.boardCols; col++) {
            let count = 1;
            let currentGem = this.board[0][col];
            
            for (let row = 1; row < this.boardRows; row++) {
                if (this.board[row][col] === currentGem) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let r = row - count; r < row; r++) {
                            const key = `${r},${col}`;
                            if (!visited.has(key)) {
                                matches.push({ row: r, col });
                                visited.add(key);
                            }
                        }
                    }
                    count = 1;
                    currentGem = this.board[row][col];
                }
            }
            
            // Check end of column
            if (count >= 3) {
                for (let r = this.boardRows - count; r < this.boardRows; r++) {
                    const key = `${r},${col}`;
                    if (!visited.has(key)) {
                        matches.push({ row: r, col });
                        visited.add(key);
                    }
                }
            }
        }
        
        return matches;
    }
    
    async processMatches() {
        this.isProcessing = true;
        
        while (true) {
            const matches = this.findMatches();
            
            if (matches.length === 0) {
                break;
            }
            
            // Update score
            this.score += matches.length * 10;
            this.updateUI();
            
            // Animate matched cells
            matches.forEach(match => {
                const cell = document.querySelector(
                    `[data-row="${match.row}"][data-col="${match.col}"]`
                );
                if (cell) {
                    cell.classList.add('matched');
                    // Create random particles for each matched cell
                    this.createExplosionParticles(cell);
                }
            });
            
            // Wait for explosion animation to complete
            await this.sleep(1000);
            
            // Clean up particles
            document.querySelectorAll('.explosion-particle').forEach(particle => {
                particle.remove();
            });
            
            // Remove matched cells
            matches.forEach(match => {
                this.board[match.row][match.col] = -1; // Mark as empty
            });
            
            // Make pieces fall
            await this.applyGravity();
            
            // Fill empty spaces
            this.fillEmptySpaces();
            
            // Re-render
            this.renderBoard();
            
            // Small delay before checking for new matches
            await this.sleep(300);
        }
        
        this.isProcessing = false;
        this.checkGameOver();
    }
    
    async applyGravity() {
        for (let col = 0; col < this.boardCols; col++) {
            let writeIndex = this.boardRows - 1;
            
            for (let row = this.boardRows - 1; row >= 0; row--) {
                if (this.board[row][col] !== -1) {
                    if (writeIndex !== row) {
                        this.board[writeIndex][col] = this.board[row][col];
                        this.board[row][col] = -1;
                    }
                    writeIndex--;
                }
            }
        }
    }
    
    fillEmptySpaces() {
        for (let row = 0; row < this.boardRows; row++) {
            for (let col = 0; col < this.boardCols; col++) {
                if (this.board[row][col] === -1) {
                    this.board[row][col] = this.getRandomGem();
                }
            }
        }
    }
    
    checkGameOver() {
        // Check if level is complete (reached target score)
        if (this.score >= this.levelTargetScore) {
            this.completeLevel();
            return;
        }
        
        // Check if moves are exhausted and target not reached - game over
        if (this.moves <= 0 && this.score < this.levelTargetScore) {
            this.gameOver();
        }
    }
    
    gameOver() {
        // Pause the game
        this.isProcessing = true;
        
        // Save best stats
        this.saveBestStats();
        
        // Play game over sound
        if (this.soundManager) {
            this.soundManager.playGameOverSound();
        }
        
        // Show game over modal
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('final-score').textContent = this.totalScore.toLocaleString();
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    retryLevel() {
        // Hide game over modal
        document.getElementById('game-over').classList.add('hidden');
        
        // Reset level score (keep total score and level)
        this.score = 0;
        
        // Reset moves for current level
        this.moves = this.getLevelMoves(this.level);
        
        // Reset game state
        this.selectedCell = null;
        this.isProcessing = false;
        
        // Create new board
        this.createBoard();
        this.renderBoard();
        this.updateUI();
    }
    
    completeLevel() {
        // Pause the game
        this.isProcessing = true;
        
        // Update total score
        this.totalScore += this.score;
        
        // Play level complete sound
        if (this.soundManager) {
            this.soundManager.playLevelCompleteSound();
        }
        
        // Show level complete modal
        document.getElementById('completed-level').textContent = this.level;
        document.getElementById('level-score').textContent = this.score;
        document.getElementById('total-score').textContent = this.totalScore;
        document.getElementById('level-complete').classList.remove('hidden');
    }
    
    continueToNextLevel() {
        // Hide level complete modal
        document.getElementById('level-complete').classList.add('hidden');
        
        // Increment level
        this.level++;
        
        // Save best stats
        this.saveBestStats();
        
        // Increase difficulty: more score needed, but also more moves
        this.levelTargetScore = this.level * 1000;
        this.moves = this.getLevelMoves(this.level); // Use correct calculation
        
        // Reset level score (keep total score)
        this.score = 0;
        
        // Create new board
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        
        // Resume game
        this.isProcessing = false;
    }
    
    goToHome() {
        // Save best stats before going home
        this.saveBestStats();
        
        // Hide all modals
        document.getElementById('level-complete').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        
        // Show home page
        this.showHome();
    }
    
    endGame() {
        // Go to home from game over screen
        this.goToHome();
    }
    
    getLevelMoves(level) {
        // Level 1: 30 moves, Level 2+: 25 + (level * 2)
        return level === 1 ? 30 : 25 + (level * 2);
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = Math.max(0, this.moves);
        document.getElementById('level').textContent = this.level;
        document.getElementById('target-score').textContent = this.levelTargetScore.toLocaleString();
        
        // Calculate and display the correct level moves
        const levelMoves = this.getLevelMoves(this.level);
        document.getElementById('level-moves').textContent = levelMoves;
        
        // Show progress to next level (optional visual indicator)
        const progress = Math.min(100, (this.score / this.levelTargetScore) * 100);
        // Could add a progress bar here if desired
    }
    
    setupEventListeners() {
        // Helper function to prevent rapid clicks
        const preventRapidClicks = (callback) => {
            return (e) => {
                if (this.buttonClickCooldown) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                this.buttonClickCooldown = true;
                const button = e.currentTarget;
                
                // Play click sound
                if (this.soundManager) {
                    this.soundManager.playClickSound();
                }
                
                // Add visual feedback
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);
                
                // Execute callback
                callback();
                
                // Reset cooldown after a short delay
                setTimeout(() => {
                    this.buttonClickCooldown = false;
                }, 300);
            };
        };
        
        document.getElementById('start-game-btn').addEventListener('click', preventRapidClicks(() => {
            this.startNewGame();
        }));
        
        document.getElementById('home-btn').addEventListener('click', preventRapidClicks(() => {
            this.goToHome();
        }));
        
        document.getElementById('reset-btn').addEventListener('click', preventRapidClicks(() => {
            this.resetGame();
        }));
        
        document.getElementById('retry-btn').addEventListener('click', preventRapidClicks(() => {
            this.retryLevel();
        }));
        
        document.getElementById('quit-game-btn').addEventListener('click', preventRapidClicks(() => {
            this.goToHome();
        }));
        
        document.getElementById('hint-btn').addEventListener('click', preventRapidClicks(() => {
            this.showHint();
        }));
        
        document.getElementById('continue-btn').addEventListener('click', preventRapidClicks(() => {
            this.continueToNextLevel();
        }));
        
        document.getElementById('quit-btn').addEventListener('click', preventRapidClicks(() => {
            this.goToHome();
        }));
        
        // Music toggle button
        const musicToggleBtn = document.getElementById('music-toggle-btn');
        if (musicToggleBtn) {
            musicToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.soundManager) {
                    this.soundManager.toggleMusic();
                    this.soundManager.playClickSound();
                }
            });
        }
    }
    
    startNewGame() {
        this.score = 0;
        this.totalScore = 0;
        this.moves = 30;
        this.level = 1;
        this.levelTargetScore = 1000;
        this.selectedCell = null;
        this.isProcessing = false;
        this.showGame();
    }
    
    resetGame() {
        // Reset current game but stay on game screen
        this.score = 0;
        this.totalScore = 0;
        this.moves = 30;
        this.level = 1;
        this.levelTargetScore = 1000;
        this.selectedCell = null;
        this.isProcessing = false;
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('level-complete').classList.add('hidden');
        this.createBoard();
        this.renderBoard();
        this.updateUI();
    }
    
    showHint() {
        // Find a valid move
        for (let row = 0; row < this.boardRows - 1; row++) {
            for (let col = 0; col < this.boardCols; col++) {
                // Try swapping down
                [this.board[row][col], this.board[row + 1][col]] = 
                [this.board[row + 1][col], this.board[row][col]];
                
                if (this.findMatches().length > 0) {
                    // Valid move found - highlight it
                    [this.board[row][col], this.board[row + 1][col]] = 
                    [this.board[row + 1][col], this.board[row][col]];
                    
                    const cell1 = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    const cell2 = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
                    
                    if (cell1 && cell2) {
                        cell1.style.boxShadow = '0 0 0 4px #00ff00';
                        cell2.style.boxShadow = '0 0 0 4px #00ff00';
                        
                        setTimeout(() => {
                            cell1.style.boxShadow = '';
                            cell2.style.boxShadow = '';
                        }, 2000);
                    }
                    return;
                }
                
                [this.board[row][col], this.board[row + 1][col]] = 
                [this.board[row + 1][col], this.board[row][col]];
            }
        }
        
        for (let row = 0; row < this.boardRows; row++) {
            for (let col = 0; col < this.boardCols - 1; col++) {
                // Try swapping right
                [this.board[row][col], this.board[row][col + 1]] = 
                [this.board[row][col + 1], this.board[row][col]];
                
                if (this.findMatches().length > 0) {
                    // Valid move found
                    [this.board[row][col], this.board[row][col + 1]] = 
                    [this.board[row][col + 1], this.board[row][col]];
                    
                    const cell1 = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    const cell2 = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`);
                    
                    if (cell1 && cell2) {
                        cell1.style.boxShadow = '0 0 0 4px #00ff00';
                        cell2.style.boxShadow = '0 0 0 4px #00ff00';
                        
                        setTimeout(() => {
                            cell1.style.boxShadow = '';
                            cell2.style.boxShadow = '';
                        }, 2000);
                    }
                    return;
                }
                
                [this.board[row][col], this.board[row][col + 1]] = 
                [this.board[row][col + 1], this.board[row][col]];
            }
        }
        
        alert('No valid moves found! Shuffling board...');
        this.createBoard();
        this.renderBoard();
    }
    
    createExplosionParticles(cell) {
        const particleEmojis = ['✨', '⭐', '💫', '🌟', '⚡', '💥'];
        const numParticles = 4 + Math.floor(Math.random() * 3); // 4-6 particles per cell
        
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            particle.textContent = particleEmojis[Math.floor(Math.random() * particleEmojis.length)];
            
            // Generate random nonlinear path
            const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.8; // Spread around circle with randomness
            const distance = 20 + Math.random() * 15; // 20-35px distance (scaled down)
            const curveAmount = 7 + Math.random() * 10; // Curve variation (scaled down)
            
            // Create curved path with 3 control points
            const x1 = Math.cos(angle) * (distance * 0.3) + (Math.random() - 0.5) * curveAmount;
            const y1 = Math.sin(angle) * (distance * 0.3) + (Math.random() - 0.5) * curveAmount;
            
            const x2 = Math.cos(angle) * (distance * 0.6) + (Math.random() - 0.5) * curveAmount * 1.5;
            const y2 = Math.sin(angle) * (distance * 0.6) + (Math.random() - 0.5) * curveAmount * 1.5;
            
            const x3 = Math.cos(angle) * distance + (Math.random() - 0.5) * curveAmount * 2;
            const y3 = Math.sin(angle) * distance + (Math.random() - 0.5) * curveAmount * 2;
            
            // Random rotation
            const rotation = (Math.random() > 0.5 ? 1 : -1) * (720 + Math.random() * 720); // 720-1440 degrees
            
            // Random scale variation
            const scale = 0.05 + Math.random() * 0.03; // 0.05-0.08
            
            // Set CSS custom properties for animation
            particle.style.setProperty('--particle-x1', `${x1}px`);
            particle.style.setProperty('--particle-y1', `${y1}px`);
            particle.style.setProperty('--particle-x2', `${x2}px`);
            particle.style.setProperty('--particle-y2', `${y2}px`);
            particle.style.setProperty('--particle-x3', `${x3}px`);
            particle.style.setProperty('--particle-y3', `${y3}px`);
            particle.style.setProperty('--particle-rotate', `${rotation}deg`);
            particle.style.setProperty('--particle-scale', scale.toString());
            
            // Random delay for staggered effect
            particle.style.animationDelay = `${Math.random() * 0.2}s`;
            
            cell.appendChild(particle);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Sound Manager Class
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        this.soundsEnabled = localStorage.getItem('soundsEnabled') !== 'false';
        this.musicOscillator = null;
        this.musicGainNode = null;
        this.isMusicPlaying = false;
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    // Start background music (looping, fun upbeat melody)
    startBackgroundMusic() {
        if (!this.audioContext || !this.musicEnabled || this.isMusicPlaying) return;
        
        try {
            this.isMusicPlaying = true;
            this.playMusicLoop();
        } catch (e) {
            console.warn('Could not start music:', e);
        }
    }
    
    playMusicLoop() {
        if (!this.audioContext || !this.musicEnabled) return;
        
        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major scale
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.musicEnabled || !this.isMusicPlaying) return;
            
            const frequency = notes[noteIndex % notes.length];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.05, this.audioContext.currentTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.6);
            
            noteIndex++;
            
            setTimeout(() => {
                if (this.musicEnabled && this.isMusicPlaying) {
                    playNote();
                }
            }, 300);
        };
        
        playNote();
    }
    
    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        if (this.musicOscillator) {
            this.musicOscillator.stop();
            this.musicOscillator = null;
        }
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('musicEnabled', this.musicEnabled);
        
        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        
        this.updateMusicButton();
    }
    
    updateMusicButton() {
        const btn = document.getElementById('music-toggle-btn');
        if (btn) {
            btn.textContent = this.musicEnabled ? '🔊' : '🔇';
        }
    }
    
    // Play swipe sound (whoosh)
    playSwipeSound() {
        if (!this.audioContext || !this.soundsEnabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    // Play match sound (successful match - cheerful chime)
    playMatchSound(count = 1) {
        if (!this.audioContext || !this.soundsEnabled) return;
        
        const frequencies = [523.25, 659.25, 783.99]; // C, E, G chord
        const delay = 0.05;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.value = freq * (1 + count * 0.1);
                
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            }, index * delay);
        });
    }
    
    // Play level complete sound (victory fanfare)
    playLevelCompleteSound() {
        if (!this.audioContext || !this.soundsEnabled) return;
        
        const melody = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
        melody.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.4);
            }, index * 150);
        });
    }
    
    // Play game over sound (sad tone)
    playGameOverSound() {
        if (!this.audioContext || !this.soundsEnabled) return;
        
        const frequencies = [392.00, 349.23, 293.66, 261.63];
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.5);
            }, index * 200);
        });
    }
    
    // Play button click sound
    playClickSound() {
        if (!this.audioContext || !this.soundsEnabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Match3Game();
});

