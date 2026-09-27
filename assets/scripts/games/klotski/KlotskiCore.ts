export type KlotskiSize = 3 | 4 | 5;

export interface KlotskiBoard {
    size: KlotskiSize;
    tiles: number[];
    emptyIndex: number;
}

export class KlotskiCore {
    private _board: KlotskiBoard;
    private _targetBoard: KlotskiBoard;
    private _moveCount: number = 0;
    private _isPlaying: boolean = false;

    constructor(size: KlotskiSize = 3) {
        this._targetBoard = this._createTargetBoard(size);
        this._board = this._cloneBoard(this._targetBoard);
    }

    get board(): KlotskiBoard {
        return this._board;
    }

    get targetBoard(): KlotskiBoard {
        return this._targetBoard;
    }

    get moveCount(): number {
        return this._moveCount;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    get isSolved(): boolean {
        return this._isBoardSolved(this._board);
    }

    private _createTargetBoard(size: KlotskiSize): KlotskiBoard {
        const total = size * size;
        const tiles: number[] = [];
        for (let i = 1; i < total; i++) {
            tiles.push(i);
        }
        tiles.push(0);
        return { size, tiles, emptyIndex: total - 1 };
    }

    private _cloneBoard(board: KlotskiBoard): KlotskiBoard {
        return {
            size: board.size,
            tiles: [...board.tiles],
            emptyIndex: board.emptyIndex,
        };
    }

    private _isBoardSolved(board: KlotskiBoard): boolean {
        const total = board.size * board.size;
        for (let i = 0; i < total - 1; i++) {
            if (board.tiles[i] !== i + 1) {
                return false;
            }
        }
        return board.tiles[total - 1] === 0;
    }

    /** 判断两个位置是否相邻 */
    private _isAdjacent(indexA: number, indexB: number, size: number): boolean {
        const rowA = Math.floor(indexA / size);
        const colA = indexA % size;
        const rowB = Math.floor(indexB / size);
        const colB = indexB % size;
        return (Math.abs(rowA - rowB) + Math.abs(colA - colB)) === 1;
    }

    /** 尝试移动指定索引的方块到空格位置 */
    tryMove(tileIndex: number): boolean {
        if (!this._isPlaying) {
            return false;
        }
        if (!this._isAdjacent(tileIndex, this._board.emptyIndex, this._board.size)) {
            return false;
        }

        const temp = this._board.tiles[tileIndex];
        this._board.tiles[tileIndex] = 0;
        this._board.tiles[this._board.emptyIndex] = temp;
        this._board.emptyIndex = tileIndex;
        this._moveCount++;
        return true;
    }

    /** 打乱棋盘，确保有解 */
    shuffle(moveCount: number = 100): void {
        this._board = this._cloneBoard(this._targetBoard);
        const size = this._board.size;
        let lastEmpty = this._board.emptyIndex;

        for (let i = 0; i < moveCount; i++) {
            const row = Math.floor(lastEmpty / size);
            const col = lastEmpty % size;
            const neighbors: number[] = [];

            if (row > 0) neighbors.push(lastEmpty - size);
            if (row < size - 1) neighbors.push(lastEmpty + size);
            if (col > 0) neighbors.push(lastEmpty - 1);
            if (col < size - 1) neighbors.push(lastEmpty + 1);

            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            const temp = this._board.tiles[randomNeighbor];
            this._board.tiles[randomNeighbor] = 0;
            this._board.tiles[lastEmpty] = temp;
            lastEmpty = randomNeighbor;
        }

        this._board.emptyIndex = lastEmpty;
        this._moveCount = 0;
        this._isPlaying = true;
    }

    /** 重置为目标状态 */
    reset(): void {
        this._board = this._cloneBoard(this._targetBoard);
        this._moveCount = 0;
        this._isPlaying = false;
    }

    /** 重新开始（打乱） */
    restart(): void {
        this.shuffle();
    }
}
