import { IDIOM_CHAIN_DATA } from './IdiomChainData';

export class IdiomChainCore {
    private _currentIdiom: string | null = null;
    private _nextIdiom: string | null = null;
    private _playerInput: string = '';
    private _isPlaying: boolean = false;
    private _score: number = 0;

    /** 每组为一条接龙链，元素为完整成语字符串 */
    private _idiomGroups: string[][] = [];
    private _currentGroupIndex: number = 0;
    private _currentIdiomIndex: number = 0;

    private readonly _disturbWords: string[] = IDIOM_CHAIN_DATA.disturbWords;

    get currentIdiom(): string | null {
        return this._currentIdiom;
    }

    get nextIdiom(): string | null {
        return this._nextIdiom;
    }

    get playerInput(): string {
        return this._playerInput;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    get score(): number {
        return this._score;
    }

    get isGameComplete(): boolean {
        return this._currentGroupIndex >= this._idiomGroups.length;
    }

    get totalGroups(): number {
        return this._idiomGroups.length;
    }

    get currentGroup(): number {
        return this._currentGroupIndex;
    }

    startGame(): void {
        this._isPlaying = true;
        this._score = 0;
        this._currentGroupIndex = 0;
        this._currentIdiomIndex = 0;
        this._idiomGroups = this._shuffleGroups();
        this._loadCurrentIdiom();
    }

    private _shuffleGroups(): string[][] {
        const groups: string[][] = IDIOM_CHAIN_DATA.idiomChain;

        for (let i = groups.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [groups[i], groups[j]] = [groups[j], groups[i]];
        }
        return groups;
    }

    /** 根据当前 group / idiom 下标同步 current、next */
    private _applyCurrentPointers(): void {
        if (this._currentGroupIndex >= this._idiomGroups.length) {
            this._currentIdiom = null;
            this._nextIdiom = null;
            return;
        }
        const group = this._idiomGroups[this._currentGroupIndex];
        if (this._currentIdiomIndex >= group.length) {
            this._currentIdiom = null;
            this._nextIdiom = null;
            return;
        }
        this._currentIdiom = group[this._currentIdiomIndex];
        this._nextIdiom = group[this._currentIdiomIndex + 1] ?? null;
    }

    private _loadCurrentIdiom(): void {
        this._applyCurrentPointers();
    }

    getDisturbWords(count: number): string[] {
        const shuffled = [...this._disturbWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

    getCurrentGroupIdioms(): string[] {
        if (this._currentGroupIndex >= this._idiomGroups.length) {
            return [];
        }
        return this._idiomGroups[this._currentGroupIndex];
    }

    submitInput(input: string): boolean {
        if (!this._currentIdiom || !this._isPlaying) return false;
        if (this.isGameComplete) return false;

        this._playerInput = input;

        if (this._validateInput(input)) {
            this._score += 10;
            this._moveToNextIdiom();
            return true;
        }
        return false;
    }

    private _validateInput(input: string): boolean {
        if (!this._currentIdiom || !this._nextIdiom) return false;
        return this._nextIdiom === input;
    }

    private _moveToNextIdiom(): void {
        const group = this._idiomGroups[this._currentGroupIndex];
        this._currentIdiomIndex++;

        if (this._currentIdiomIndex >= group.length) {
            this._currentGroupIndex++;
            this._currentIdiomIndex = 0;
            if (this._currentGroupIndex >= this._idiomGroups.length) {
                this._currentIdiom = null;
                this._nextIdiom = null;
                return;
            }
        }

        this._applyCurrentPointers();

        while (this._nextIdiom == null && this._currentIdiom != null) {
            if (this._currentGroupIndex >= this._idiomGroups.length - 1) {
                this._currentGroupIndex = this._idiomGroups.length;
                this._currentIdiom = null;
                this._nextIdiom = null;
                return;
            }
            this._currentGroupIndex++;
            this._currentIdiomIndex = 0;
            this._applyCurrentPointers();
        }
    }

    getCurrentCharButtons(): string[] {
        if (!this._nextIdiom) return [];

        const result: string[] = [];
        const nextIdiomChars = this._nextIdiom.split('');

        for (const char of nextIdiomChars) {
            result.push(char);
        }

        const disturbCount = 12 - nextIdiomChars.length;
        const disturbWords = this.getDisturbWords(disturbCount);

        for (const word of disturbWords) {
            result.push(word);
        }

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    reset(): void {
        this._currentIdiom = null;
        this._nextIdiom = null;
        this._playerInput = '';
        this._isPlaying = false;
        this._score = 0;
        this._currentGroupIndex = 0;
        this._currentIdiomIndex = 0;
        this._idiomGroups = [];
    }
}
