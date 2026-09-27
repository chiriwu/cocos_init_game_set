import { HISTORY_SEQ, ChessPieceGenerator } from './ChessClearHistory';

/** 棋盘交叉点上的棋子 */
export interface BoardPiece {
    type: string;
    col: number;
    row: number;
}

export class ChessClearCore {
    /** 纵向 9 路、横向 10 路（交叉点数量） */
    static readonly COLS = 9;
    static readonly ROWS = 10;
    static readonly ROOK_TYPE = '车';
    static readonly PIECE_VALUES: Record<string, number> = {
        '卒': 0.85,
        '士': 1.35,
        '象': 1.65,
        '马': 1.75,
        '炮': 1.85,
        '车': 2.45,
    };
    static readonly BASE_STEPS = 0.15;
    static readonly SAME_TYPE_DISCOUNT = 0.1;

    /**
     * 根据棋子组合计算所需步数
     * 计算公式: S = BASE_STEPS + Σ(ki × ni) - Σ(C(ni,2) × SAME_TYPE_DISCOUNT)
     * 其中:
     *   - ki: 第i种棋子的单位价值系数
     *   - ni: 第i种棋子的数量
     *   - C(ni,2): 同类棋子的组合数 n*(n-1)/2，用于计算组合折扣
     * 
     * @param pieces 棋子类型数组
     * @returns 计算出的步数（四舍五入）
     */
    static calculateSteps(pieces: string[]): number {
        const counts: Record<string, number> = {};
        for (const p of pieces) {
            counts[p] = (counts[p] || 0) + 1;
        }

        let value = ChessClearCore.BASE_STEPS;
        for (const [type, count] of Object.entries(counts)) {
            const unitValue = ChessClearCore.PIECE_VALUES[type] || 1.0;
            value += unitValue * count;
            if (count > 1) {
                value -= ChessClearCore.SAME_TYPE_DISCOUNT * (count * (count - 1) / 2);
            }
        }
        return Math.round(value);
    }

    private _isPlaying = false;
    private _rookCol = 0;
    private _rookRow = 0;
    private _enemies: BoardPiece[] = [];
    private _remainingSteps = 0;
    private _nextBatch: string[] = [];
    private _usedPositions: Set<string> = new Set();
    private _rookCaptured = false;
    private _captureByEnemy: BoardPiece | null = null;
    private _historyIndex = 0;
    private _generatedHistory: string[][] = [];

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    get isRookCaptured(): boolean {
        return this._rookCaptured;
    }

    get captureByEnemy(): BoardPiece | null {
        return this._captureByEnemy;
    }

    get remainingSteps(): number {
        return this._remainingSteps;
    }

    get rookCol(): number {
        return this._rookCol;
    }

    get rookRow(): number {
        return this._rookRow;
    }

    get enemies(): readonly BoardPiece[] {
        return this._enemies;
    }

    get nextBatch(): readonly string[] {
        return this._nextBatch;
    }

    get remainingEnemyCount(): number {
        return this._enemies.length;
    }

    isRookAt(col: number, row: number): boolean {
        return this._rookCol === col && this._rookRow === row;
    }

    getEnemyAt(col: number, row: number): BoardPiece | null {
        return this._enemies.find((e) => e.col === col && e.row === row) ?? null;
    }

    isInsideBoard(col: number, row: number): boolean {
        return col >= 0 && col < ChessClearCore.COLS && row >= 0 && row < ChessClearCore.ROWS;
    }

    private _posKey(col: number, row: number): string {
        return `${col},${row}`;
    }

    private _generateNextBatch(): string[] {
        let result: string[];
        
        if (this._historyIndex < HISTORY_SEQ.length) {
            // 在 HISTORY_SEQ 范围内，直接使用预设数据
            result = [...HISTORY_SEQ[this._historyIndex][0]];
            this._generatedHistory.push(result);
            this._historyIndex++;
        } else {
            // 超出范围，使用智能生成器生成新组合
            // 根据历史记录预测下一步棋子组合
            const recentHistory = [...HISTORY_SEQ.map(e => e[0]), ...this._generatedHistory];
            result = ChessPieceGenerator.generateNextCombination(recentHistory);
            this._generatedHistory.push(result);
        }
        
        return result;
    }

    private _placeNextBatch(): void {
        const batch = [...this._nextBatch];
        batch.forEach((type) => {
            let attempts = 0;
            const maxAttempts = 100;
            while (attempts < maxAttempts) {
                const col = Math.floor(Math.random() * ChessClearCore.COLS);
                const row = Math.floor(Math.random() * ChessClearCore.ROWS);
                const key = this._posKey(col, row);

                if (!this._usedPositions.has(key) && !this.isRookAt(col, row) && col !== this._rookCol && row !== this._rookRow) {
                    const canCapture = this._canEnemyCaptureRookAtPosition(type, col, row);

                    if (!canCapture) {
                        this._enemies.push({ type, col, row });
                        this._usedPositions.add(key);
                        break;
                    }
                }
                attempts++;
            }
        });
        
        // 计算步数
        if (this._historyIndex <= HISTORY_SEQ.length) {
            // 在 HISTORY_SEQ 范围内，使用预设步数
            const prevIndex = this._historyIndex - 1;
            if (prevIndex >= 0 && prevIndex < HISTORY_SEQ.length) {
                this._remainingSteps = HISTORY_SEQ[prevIndex][1];
            } else {
                this._remainingSteps = ChessPieceGenerator.calculateSteps(batch);
            }
        } else {
            // 超出范围，使用生成器计算步数
            this._remainingSteps = ChessPieceGenerator.calculateSteps(batch);
        }
        
        this._nextBatch = this._generateNextBatch();
    }

    /**
     * 检查特定类型的棋子在特定位置能否吃掉车
     */
    private _canEnemyCaptureRookAtPosition(type: string, col: number, row: number): boolean {
        const tempEnemy: BoardPiece = { type, col, row };
        const originalEnemy = this.getEnemyAt(col, row);
        if (originalEnemy) {
            this._usedPositions.delete(this._posKey(col, row));
            this._enemies = this._enemies.filter(
                (e) => !(e.col === col && e.row === row),
            );
        }

        const canCapture = this._canEnemyCaptureRook(tempEnemy);

        if (originalEnemy) {
            this._enemies.push(originalEnemy);
            this._usedPositions.add(this._posKey(col, row));
        }

        return canCapture;
    }

    startGame(): void {
        this._isPlaying = true;
        this._rookCaptured = false;
        this._captureByEnemy = null;
        this._historyIndex = 0;
        this._generatedHistory = [];
        this._rookCol = 4;
        this._rookRow = 5;
        this._usedPositions = new Set();
        this._usedPositions.add(this._posKey(this._rookCol, this._rookRow));
        
        // 初始敌人为2个卒（对应 HISTORY_SEQ[0] 的棋子组合）
        this._enemies = [
            { type: '卒', col: 7, row: 0 },
            { type: '卒', col: 0, row: 2 },
        ];
        
        this._enemies.forEach(e => this._usedPositions.add(this._posKey(e.col, e.row)));
        // 使用 HISTORY_SEQ[0] 中存储的步数
        this._remainingSteps = HISTORY_SEQ[0][1];
        this._nextBatch = this._generateNextBatch();
    }

    reset(): void {
        this._isPlaying = false;
        this._rookCaptured = false;
        this._captureByEnemy = null;
        this._remainingSteps = 0;
        this._enemies = [];
        this._nextBatch = [];
        this._usedPositions.clear();
    }

    private _getFirstEnemiesInRookDirections(): BoardPiece[] {
        const found: BoardPiece[] = [];
        const directions = [
            { dc: 1, dr: 0 },
            { dc: -1, dr: 0 },
            { dc: 0, dr: 1 },
            { dc: 0, dr: -1 },
        ];

        for (const { dc, dr } of directions) {
            let c = this._rookCol + dc;
            let r = this._rookRow + dr;
            while (this.isInsideBoard(c, r)) {
                const enemy = this.getEnemyAt(c, r);
                if (enemy) {
                    found.push(enemy);
                    break;
                }
                c += dc;
                r += dr;
            }
        }
        return found;
    }

    private _isEnemyInDanger(enemy: BoardPiece): boolean {
        return this._getFirstEnemiesInRookDirections().some(
            (e) => e.col === enemy.col && e.row === enemy.row,
        );
    }

    private _isPositionInRookLineOfFire(col: number, row: number): boolean {
        if (col === this._rookCol && row === this._rookRow) {
            return true;
        }
        if (row === this._rookRow) {
            const step = col > this._rookCol ? 1 : -1;
            for (let c = this._rookCol + step; c !== col; c += step) {
                if (this.getEnemyAt(c, row)) {
                    return false;
                }
            }
            return true;
        }
        if (col === this._rookCol) {
            const step = row > this._rookRow ? 1 : -1;
            for (let r = this._rookRow + step; r !== row; r += step) {
                if (this.getEnemyAt(col, r)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    private _canEnemyCaptureRook(enemy: BoardPiece): boolean {
        return this._isPositionInRookLineOfFire(enemy.col, enemy.row);
    }

    private _canAnyEnemyCaptureRook(): BoardPiece | null {
        return this._enemies.find((e) => this._canEnemyCaptureRook(e)) || null;
    }

    private _moveEnemy(enemy: BoardPiece, col: number, row: number): void {
        this._usedPositions.delete(this._posKey(enemy.col, enemy.row));
        enemy.col = col;
        enemy.row = row;
        this._usedPositions.add(this._posKey(col, row));
    }

    private _getPawnMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        const directions = [
            { dc: 0, dr: -1 },
            { dc: 0, dr: 1 },
            { dc: -1, dr: 0 },
            { dc: 1, dr: 0 },
        ];
        
        for (const { dc, dr } of directions) {
            const newCol = enemy.col + dc;
            const newRow = enemy.row + dr;
            if (this.isInsideBoard(newCol, newRow) && 
                !this.isRookAt(newCol, newRow) && 
                !this._usedPositions.has(this._posKey(newCol, newRow))) {
                moves.push({ col: newCol, row: newRow });
            }
        }
        
        return moves;
    }

    private _getGuardMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        const directions = [
            { dc: -1, dr: -1 },
            { dc: -1, dr: 1 },
            { dc: 1, dr: -1 },
            { dc: 1, dr: 1 },
        ];
        
        for (const { dc, dr } of directions) {
            const newCol = enemy.col + dc;
            const newRow = enemy.row + dr;
            if (this.isInsideBoard(newCol, newRow) &&
                newCol >= 3 && newCol <= 5 &&
                (newRow >= 0 && newRow <= 2 || newRow >= 7 && newRow <= 9) &&
                !this.isRookAt(newCol, newRow) &&
                !this._usedPositions.has(this._posKey(newCol, newRow))) {
                moves.push({ col: newCol, row: newRow });
            }
        }
        
        return moves;
    }

    private _getKnightMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        const directions = [
            { dc: -2, dr: -1 },
            { dc: -2, dr: 1 },
            { dc: -1, dr: -2 },
            { dc: -1, dr: 2 },
            { dc: 1, dr: -2 },
            { dc: 1, dr: 2 },
            { dc: 2, dr: -1 },
            { dc: 2, dr: 1 },
        ];
        
        for (const { dc, dr } of directions) {
            const newCol = enemy.col + dc;
            const newRow = enemy.row + dr;
            if (this.isInsideBoard(newCol, newRow) &&
                !this.isRookAt(newCol, newRow) &&
                !this._usedPositions.has(this._posKey(newCol, newRow))) {
                moves.push({ col: newCol, row: newRow });
            }
        }
        
        return moves;
    }

    private _getElephantMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        const directions = [
            { dc: -2, dr: -2 },
            { dc: -2, dr: 2 },
            { dc: 2, dr: -2 },
            { dc: 2, dr: 2 },
        ];
        
        const isRed = enemy.row < 5;
        const riverRow = isRed ? 4 : 5;
        
        for (const { dc, dr } of directions) {
            const midCol = enemy.col + dc / 2;
            const midRow = enemy.row + dr / 2;
            
            if (this.getEnemyAt(midCol, midRow)) {
                continue;
            }
            
            const newCol = enemy.col + dc;
            const newRow = enemy.row + dr;
            
            if (isRed && newRow > riverRow) continue;
            if (!isRed && newRow < riverRow) continue;
            
            if (this.isInsideBoard(newCol, newRow) &&
                !this.isRookAt(newCol, newRow) &&
                !this._usedPositions.has(this._posKey(newCol, newRow))) {
                moves.push({ col: newCol, row: newRow });
            }
        }
        
        return moves;
    }

    private _getCannonMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        
        for (let c = enemy.col + 1; c < ChessClearCore.COLS; c++) {
            const key = this._posKey(c, enemy.row);
            if (this._usedPositions.has(key)) {
                for (let cc = c + 1; cc < ChessClearCore.COLS; cc++) {
                    const targetKey = this._posKey(cc, enemy.row);
                    if (this._usedPositions.has(targetKey)) {
                        if (!this.isRookAt(cc, enemy.row)) {
                            moves.push({ col: cc, row: enemy.row });
                        }
                        break;
                    }
                }
                break;
            }
        }
        
        for (let c = enemy.col - 1; c >= 0; c--) {
            const key = this._posKey(c, enemy.row);
            if (this._usedPositions.has(key)) {
                for (let cc = c - 1; cc >= 0; cc--) {
                    const targetKey = this._posKey(cc, enemy.row);
                    if (this._usedPositions.has(targetKey)) {
                        if (!this.isRookAt(cc, enemy.row)) {
                            moves.push({ col: cc, row: enemy.row });
                        }
                        break;
                    }
                }
                break;
            }
        }
        
        for (let r = enemy.row + 1; r < ChessClearCore.ROWS; r++) {
            const key = this._posKey(enemy.col, r);
            if (this._usedPositions.has(key)) {
                for (let rr = r + 1; rr < ChessClearCore.ROWS; rr++) {
                    const targetKey = this._posKey(enemy.col, rr);
                    if (this._usedPositions.has(targetKey)) {
                        if (!this.isRookAt(enemy.col, rr)) {
                            moves.push({ col: enemy.col, row: rr });
                        }
                        break;
                    }
                }
                break;
            }
        }
        
        for (let r = enemy.row - 1; r >= 0; r--) {
            const key = this._posKey(enemy.col, r);
            if (this._usedPositions.has(key)) {
                for (let rr = r - 1; rr >= 0; rr--) {
                    const targetKey = this._posKey(enemy.col, rr);
                    if (this._usedPositions.has(targetKey)) {
                        if (!this.isRookAt(enemy.col, rr)) {
                            moves.push({ col: enemy.col, row: rr });
                        }
                        break;
                    }
                }
                break;
            }
        }
        
        return moves;
    }

    private _getKingMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        const directions = [
            { dc: 0, dr: -1 },
            { dc: 0, dr: 1 },
            { dc: -1, dr: 0 },
            { dc: 1, dr: 0 },
        ];
        
        const isRed = enemy.row < 5;
        const startCol = 3, endCol = 5;
        const startRow = isRed ? 0 : 7;
        const endRow = isRed ? 2 : 9;
        
        for (const { dc, dr } of directions) {
            const newCol = enemy.col + dc;
            const newRow = enemy.row + dr;
            if (this.isInsideBoard(newCol, newRow) &&
                newCol >= startCol && newCol <= endCol &&
                newRow >= startRow && newRow <= endRow &&
                !this.isRookAt(newCol, newRow) &&
                !this._usedPositions.has(this._posKey(newCol, newRow))) {
                moves.push({ col: newCol, row: newRow });
            }
        }
        
        return moves;
    }

    private _getEnemyMoves(enemy: BoardPiece): { col: number; row: number }[] {
        switch (enemy.type) {
            case '卒':
                return this._getPawnMoves(enemy);
            case '士':
                return this._getGuardMoves(enemy);
            case '马':
                return this._getKnightMoves(enemy);
            case '象':
                return this._getElephantMoves(enemy);
            case '炮':
                return this._getCannonMoves(enemy);
            case '将':
                return this._getKingMoves(enemy);
            case '车':
                return this._getRookMoves(enemy);
            default:
                return [];
        }
    }

    private _getRookMoves(enemy: BoardPiece): { col: number; row: number }[] {
        const moves: { col: number; row: number }[] = [];
        
        for (let c = enemy.col + 1; c < ChessClearCore.COLS; c++) {
            const key = this._posKey(c, enemy.row);
            if (this._usedPositions.has(key)) {
                if (!this.isRookAt(c, enemy.row)) {
                    moves.push({ col: c, row: enemy.row });
                }
                break;
            }
            moves.push({ col: c, row: enemy.row });
        }
        
        for (let c = enemy.col - 1; c >= 0; c--) {
            const key = this._posKey(c, enemy.row);
            if (this._usedPositions.has(key)) {
                if (!this.isRookAt(c, enemy.row)) {
                    moves.push({ col: c, row: enemy.row });
                }
                break;
            }
            moves.push({ col: c, row: enemy.row });
        }
        
        for (let r = enemy.row + 1; r < ChessClearCore.ROWS; r++) {
            const key = this._posKey(enemy.col, r);
            if (this._usedPositions.has(key)) {
                if (!this.isRookAt(enemy.col, r)) {
                    moves.push({ col: enemy.col, row: r });
                }
                break;
            }
            moves.push({ col: enemy.col, row: r });
        }
        
        for (let r = enemy.row - 1; r >= 0; r--) {
            const key = this._posKey(enemy.col, r);
            if (this._usedPositions.has(key)) {
                if (!this.isRookAt(enemy.col, r)) {
                    moves.push({ col: enemy.col, row: r });
                }
                break;
            }
            moves.push({ col: enemy.col, row: r });
        }
        
        return moves;
    }

    private _moveFirstDangerousEnemy(): void {
        const captor = this._canAnyEnemyCaptureRook();
        if (captor) {
            this._captureByEnemy = captor;
            this._rookCaptured = true;
            this._isPlaying = false;
            return;
        }

        const dangerousEnemies: BoardPiece[] = [];
        for (const enemy of this._enemies) {
            if (this._isEnemyInDanger(enemy)) {
                dangerousEnemies.push(enemy);
            }
        }

        for (const enemy of dangerousEnemies) {
            const moves = this._getEnemyMoves(enemy);
            if (moves.length === 0) continue;

            const safeMovesAfterMove: { col: number; row: number }[] = [];
            for (const move of moves) {
                const oldCol = enemy.col;
                const oldRow = enemy.row;

                this._usedPositions.delete(this._posKey(oldCol, oldRow));
                enemy.col = move.col;
                enemy.row = move.row;

                const stillDangerous = this._isEnemyInDanger(enemy);

                enemy.col = oldCol;
                enemy.row = oldRow;
                this._usedPositions.add(this._posKey(oldCol, oldRow));

                if (!stillDangerous) {
                    safeMovesAfterMove.push(move);
                }
            }

            if (safeMovesAfterMove.length > 0) {
                const move = safeMovesAfterMove[Math.floor(Math.random() * safeMovesAfterMove.length)];
                this._moveEnemy(enemy, move.col, move.row);
                return;
            }
        }

        const shuffledEnemies = [...this._enemies].sort(() => Math.random() - 0.5);
        for (const enemy of shuffledEnemies) {
            const moves = this._getEnemyMoves(enemy);
            if (moves.length > 0) {
                const move = moves[Math.floor(Math.random() * moves.length)];
                this._moveEnemy(enemy, move.col, move.row);
                return;
            }
        }
    }

    moveRookTo(targetCol: number, targetRow: number): boolean {
        if (!this._isPlaying || this._rookCaptured) return false;

        if (targetCol < 0 || targetCol >= ChessClearCore.COLS || targetRow < 0 || targetRow >= ChessClearCore.ROWS) {
            return false;
        }

        if (!this._isPositionInRookLineOfFire(targetCol, targetRow)) {
            return false;
        }

        const enemy = this.getEnemyAt(targetCol, targetRow);
        if (enemy) {
            this._enemies = this._enemies.filter(
                (e) => !(e.col === targetCol && e.row === targetRow),
            );
            this._usedPositions.delete(this._posKey(targetCol, targetRow));
        }

        this._usedPositions.delete(this._posKey(this._rookCol, this._rookRow));
        this._rookCol = targetCol;
        this._rookRow = targetRow;
        this._usedPositions.add(this._posKey(this._rookCol, this._rookRow));

        this._remainingSteps--;

        if (this._remainingSteps <= 0) {
            this._placeNextBatch();
        }

        this._moveFirstDangerousEnemy();

        return true;
    }

    isLevelCleared(): boolean {
        return this._isPlaying && this._enemies.length === 0;
    }
}