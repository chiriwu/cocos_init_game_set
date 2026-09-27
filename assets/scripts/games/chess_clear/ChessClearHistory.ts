/** 棋子类型 */
export type PieceType = '卒' | '士' | '象' | '马' | '炮' | '车' | '将';

export const HISTORY_SEQ: HistoryEntry[] = [
    [["卒", "卒"], 2],
    [["卒", "卒"], 2],
    [["士"], 2],
    [["士", "士"], 3],
    [["卒", "卒", "士"], 4],
    [["士", "卒"], 4],
    [["士", "士", "将"], 4],
    [["象"], 2],
    [["象", "卒"], 3],
    [["象", "士"], 4],
    [["象", "士", "士"], 5],
    [["卒", "卒"], 2],
    [["马"], 2],
    [["马", "卒"], 4],
    [["象", "士"], 3],
    [["马", "象", "士"], 5],
    [["马", "马"], 4],
    [["士", "士", "将"], 4],
    [["炮"], 2],
    [["炮", "卒"], 4],
    [["象", "士"], 3],
    [["炮", "马", "象"], 5],
    [["炮", "炮", "卒"], 5],
    [["车"], 3],
    [["车", "炮"], 5],
    [["马", "象", "士"], 4],
    [["炮", "卒"], 4],
    [["车", "车"], 5],
    [["士", "士", "将"], 3],

    [["卒", "卒", "卒"], 3],
    [["士", "士", "象", "象"], 5],
    [["象", "象", "马", "炮"], 7],
    [["车", "马", "马"], 6],
    [["士", "士", "卒", "卒"], 3],
    [["车", "炮", "炮"], 5],
];

/** 棋子组合生成器 */
export class ChessPieceGenerator {
    private static readonly PIECE_TYPES: PieceType[] = ['卒', '士', '象', '马', '炮', '车', '将'];
    
    /** 棋子出现频率 */
    private static readonly PIECE_FREQUENCIES: Record<PieceType, number> = {
        '卒': 0.35, '士': 0.25, '象': 0.15, '马': 0.12, '炮': 0.10, '车': 0.02, '将': 0.01,
    };
    
    /** 棋子价值系数 */
    private static readonly PIECE_VALUES: Record<PieceType, number> = {
        '卒': 1.0, '士': 1.2, '象': 1.5, '马': 1.8, '炮': 1.8, '车': 3.0, '将': 3.5,
    };
    
    /** 历史统计数据 */
    private static readonly HISTORY_STATS = ChessPieceGenerator._computeHistoryStats();
    
    /**
     * 计算历史统计数据
     * 包含:
     * - pieceFrequencies: 各棋子出现频率
     * - sizeDistribution: 组合大小分布
     * - sizeTransitions: 组合大小转移概率矩阵（从size[i]到size[j]的概率）
     * - lastPieceProb: 每种棋子作为最后一个出现的概率
     * - sequenceProb: 相邻棋子共现概率
     */
    private static _computeHistoryStats() {
        const stats = {
            pieceFrequencies: new Map<PieceType, number>(),
            sizeDistribution: new Map<number, number>(),
            sizeTransitions: new Map<string, number>(),
            lastPieceProb: new Map<PieceType, number>(),
            sequenceProb: new Map<string, number>(),
            piecePositionProb: new Map<string, number>(),
        };
        
        for (const piece of ChessPieceGenerator.PIECE_TYPES) {
            stats.pieceFrequencies.set(piece, 0);
            stats.lastPieceProb.set(piece, 0);
        }
        
        let totalPieces = 0;
        let totalSequences = 0;
        
        for (let i = 0; i < HISTORY_SEQ.length; i++) {
            const [pieces] = HISTORY_SEQ[i];
            
            for (let pos = 0; pos < pieces.length; pos++) {
                const piece = pieces[pos] as PieceType;
                stats.pieceFrequencies.set(piece, 
                    (stats.pieceFrequencies.get(piece) || 0) + 1);
                totalPieces++;
                
                const posKey = `${pos}-${piece}`;
                stats.piecePositionProb.set(posKey, 
                    (stats.piecePositionProb.get(posKey) || 0) + 1);
            }
            
            stats.sizeDistribution.set(pieces.length, 
                (stats.sizeDistribution.get(pieces.length) || 0) + 1);
            
            if (i < HISTORY_SEQ.length - 1) {
                const nextSize = HISTORY_SEQ[i + 1][0].length;
                const transKey = `${pieces.length}->${nextSize}`;
                stats.sizeTransitions.set(transKey, 
                    (stats.sizeTransitions.get(transKey) || 0) + 1);
            }
            
            const lastPiece = pieces[pieces.length - 1] as PieceType;
            stats.lastPieceProb.set(lastPiece, 
                (stats.lastPieceProb.get(lastPiece) || 0) + 1);
            
            for (let j = 0; j < pieces.length - 1; j++) {
                const seqKey = `${pieces[j]}-${pieces[j + 1]}`;
                stats.sequenceProb.set(seqKey, 
                    (stats.sequenceProb.get(seqKey) || 0) + 1);
                totalSequences++;
            }
        }
        
        for (const piece of ChessPieceGenerator.PIECE_TYPES) {
            const freq = stats.pieceFrequencies.get(piece) || 0;
            stats.pieceFrequencies.set(piece, freq / totalPieces);
            
            const lastCount = stats.lastPieceProb.get(piece) || 0;
            stats.lastPieceProb.set(piece, lastCount / HISTORY_SEQ.length);
        }
        
        for (const [key, count] of stats.sizeTransitions) {
            const [from] = key.split('->').map(Number);
            const fromCount = stats.sizeDistribution.get(from) || 0;
            stats.sizeTransitions.set(key, count / fromCount);
        }
        
        return stats;
    }
    
    /**
     * 根据前序组合生成下一步棋子组合
     * @param previousCombinations 前序组合历史
     * @param targetSteps 目标步数（可选）
     * @returns 生成的棋子组合
     */
    static generateNextCombination(
        previousCombinations: string[][],
        targetSteps?: number
    ): string[] {
        const size = ChessPieceGenerator._selectSizeWithSequence(previousCombinations, targetSteps);
        const combination = ChessPieceGenerator._generatePiecesWithSequence(size, previousCombinations);
        
        if (targetSteps !== undefined && targetSteps > 0) {
            return ChessPieceGenerator._adjustToTargetSteps(combination, targetSteps);
        }
        
        return combination;
    }
    
    /**
     * 基于序列规律选择组合大小
     */
    private static _selectSizeWithSequence(
        previousCombinations: string[][],
        targetSteps?: number
    ): number {
        if (targetSteps !== undefined) {
            if (targetSteps <= 2) return Math.random() < 0.7 ? 1 : 2;
            if (targetSteps <= 3) return Math.random() < 0.6 ? 2 : (Math.random() < 0.5 ? 1 : 3);
            if (targetSteps <= 5) return Math.random() < 0.5 ? 3 : 2;
            return Math.random() < 0.6 ? 4 : 3;
        }
        
        const prevSize = previousCombinations.length > 0 
            ? previousCombinations[previousCombinations.length - 1].length 
            : 2;
        
        const transitions: number[] = [];
        for (let nextSize = 1; nextSize <= 5; nextSize++) {
            const key = `${prevSize}->${nextSize}`;
            const prob = ChessPieceGenerator.HISTORY_STATS.sizeTransitions.get(key) || 0.2;
            transitions.push(prob);
        }
        
        return ChessPieceGenerator._weightedRandomSelect([1, 2, 3, 4, 5], transitions);
    }
    
    /**
     * 生成棋子组合（考虑序列相关性）
     */
    private static _generatePiecesWithSequence(
        size: number,
        previousCombinations: string[][]
    ): string[] {
        const result: string[] = [];
        
        const recentLastPieces = previousCombinations.slice(-3).map(c => c[c.length - 1]);
        const recentFirstPieces = previousCombinations.slice(-3).map(c => c[0]);
        
        for (let i = 0; i < size; i++) {
            const piece = ChessPieceGenerator._selectPieceWithContext(
                result, 
                recentLastPieces,
                recentFirstPieces,
                i === 0,
                i === size - 1
            );
            result.push(piece);
        }
        
        return result;
    }
    
    /**
     * 基于上下文选择棋子
     */
    private static _selectPieceWithContext(
        current: string[],
        recentLastPieces: string[],
        recentFirstPieces: string[],
        isFirst: boolean,
        isLast: boolean
    ): string {
        const scores: Record<PieceType, number> = {
            '卒': 0, '士': 0, '象': 0, '马': 0, '炮': 0, '车': 0, '将': 0
        };
        
        for (const piece of ChessPieceGenerator.PIECE_TYPES) {
            scores[piece] += (ChessPieceGenerator.HISTORY_STATS.pieceFrequencies.get(piece) || 0.1) * 10;
            
            if (current.length > 0) {
                const lastPiece = current[current.length - 1];
                const seqKey = `${lastPiece}-${piece}`;
                const seqProb = ChessPieceGenerator.HISTORY_STATS.sequenceProb.get(seqKey) || 1;
                scores[piece] += seqProb * 3;
            }
            
            const lastRepeat = recentLastPieces.filter(p => p === piece).length;
            scores[piece] -= lastRepeat * 2;
            
            const firstRepeat = recentFirstPieces.filter(p => p === piece).length;
            scores[piece] -= firstRepeat * 1.5;
            
            if (isFirst) {
                if (['卒', '士', '马', '炮'].includes(piece)) {
                    scores[piece] += 1.5;
                } else if (['车', '将', '象'].includes(piece)) {
                    scores[piece] -= 1;
                }
            }
            
            if (isLast) {
                if (['车', '将', '炮'].includes(piece)) {
                    scores[piece] += 1.5;
                } else if (['卒', '士', '象'].includes(piece)) {
                    scores[piece] -= 0.5;
                }
            }
            
            const currentCount = current.filter(p => p === piece).length;
            scores[piece] -= currentCount * 4;
            
            if (piece === '车') scores[piece] -= 0.5;
            if (piece === '将') scores[piece] -= 0.8;
        }
        
        const weights = ChessPieceGenerator.PIECE_TYPES.map(p => Math.max(0.1, scores[p]));
        return ChessPieceGenerator._weightedRandomSelect(ChessPieceGenerator.PIECE_TYPES, weights);
    }
    
    /**
     * 加权随机选择
     */
    private static _weightedRandomSelect<T>(items: T[], weights: number[]): T {
        let total = 0;
        const validWeights = weights.map(w => {
            const v = Math.max(0.1, w);
            total += v;
            return v;
        });
        
        let rand = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            rand -= validWeights[i];
            if (rand <= 0) return items[i];
        }
        
        return items[0];
    }
    
    /**
     * 调整组合以接近目标步数
     */
    private static _adjustToTargetSteps(combination: string[], targetSteps: number): string[] {
        let result = [...combination];
        const currentValue = ChessPieceGenerator.calculateSteps(result);
        
        if (Math.abs(currentValue - targetSteps) <= 1) {
            return result;
        }
        
        const diff = targetSteps - currentValue;
        
        if (diff > 0) {
            result = ChessPieceGenerator._increaseValue(result, diff);
        } else {
            result = ChessPieceGenerator._decreaseValue(result, -diff);
        }
        
        return result;
    }
    
    /**
     * 增加组合价值
     */
    private static _increaseValue(combination: string[], neededDiff: number): string[] {
        const result = [...combination];
        const highValueFirst = ['车', '将', '马', '炮'];
        
        while (neededDiff > 0 && result.length < 6) {
            for (const piece of highValueFirst) {
                if (result.filter(p => p === piece).length < 2) {
                    result.push(piece);
                    neededDiff -= Math.round(ChessPieceGenerator.PIECE_VALUES[piece as PieceType]);
                    break;
                }
            }
            if (neededDiff > 0 && result.length >= 6) break;
        }
        
        return result;
    }
    
    /**
     * 减少组合价值
     */
    private static _decreaseValue(combination: string[], neededDiff: number): string[] {
        const result = [...combination];
        
        while (neededDiff > 0 && result.length > 1) {
            const highValueIndices = result
                .map((p, i) => ['车', '将', '马', '炮'].includes(p) ? i : -1)
                .filter(i => i >= 0);
            
            if (highValueIndices.length > 0) {
                const idx = highValueIndices[Math.floor(Math.random() * highValueIndices.length)];
                result.splice(idx, 1);
                neededDiff -= 2;
            } else {
                break;
            }
        }
        
        return result;
    }
    
    /**
     * 计算组合的步数
     */
    static calculateSteps(pieces: string[]): number {
        const value = pieces.reduce(
            (sum, p) => sum + (ChessPieceGenerator.PIECE_VALUES[p as PieceType] || 1), 0
        );
        return Math.round(value);
    }
}

export type HistoryEntry = [string[], number];

