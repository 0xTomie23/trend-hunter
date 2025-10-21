import pinyin from 'pinyin';
import stringSimilarity from 'string-similarity';

/**
 * 针对音近字优化的版本
 * 专门处理 "索拉拉" vs "锁啦啦" vs "嗦啦娜" 这类情况
 */
export class ChineseSimilarityV2 {
  
  /**
   * 计算相似度（音近字优化版）
   * 提高拼音权重，降低字形要求
   */
  static calculate(name1: string, name2: string): number {
    const norm1 = this.normalize(name1);
    const norm2 = this.normalize(name2);
    
    if (norm1 === norm2) return 1.0;
    
    // 检测是否包含中文
    const hasChinese1 = /[\u4e00-\u9fa5]/.test(name1);
    const hasChinese2 = /[\u4e00-\u9fa5]/.test(name2);
    
    if (!hasChinese1 || !hasChinese2) {
      // 如果不是中文，使用标准算法
      return stringSimilarity.compareTwoStrings(norm1, norm2);
    }
    
    // 1. 拼音相似度（权重70%）- 大幅提升！
    const pinyinScore = this.calculatePinyinSimilarity(name1, name2);
    
    // 2. 字符串相似度（权重20%）- 降低字形要求
    const stringScore = stringSimilarity.compareTwoStrings(norm1, norm2);
    
    // 3. 包含关系加分（权重10%）
    const containsScore = this.calculateContainsScore(norm1, norm2);
    
    // 加权计算（更侧重拼音）
    const finalScore = (
      pinyinScore * 0.70 +
      stringScore * 0.20 +
      containsScore * 0.10
    );
    
    return Math.min(finalScore, 1.0);
  }
  
  /**
   * 拼音相似度（无音调版本）
   */
  private static calculatePinyinSimilarity(name1: string, name2: string): number {
    const py1 = this.toPinyin(name1);
    const py2 = this.toPinyin(name2);
    
    // 无音调拼音匹配（权重最高）
    const noToneMatch = stringSimilarity.compareTwoStrings(py1.noTone, py2.noTone);
    
    // 首字母匹配
    const initialMatch = stringSimilarity.compareTwoStrings(py1.initial, py2.initial);
    
    // 综合：无音调权重80%，首字母20%
    return noToneMatch * 0.8 + initialMatch * 0.2;
  }
  
  /**
   * 转拼音
   */
  private static toPinyin(text: string): {
    noTone: string;
    initial: string;
  } {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    
    if (chineseChars.length === 0) {
      const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
      return {
        noTone: normalized,
        initial: normalized
      };
    }
    
    const pinyinArray = pinyin(chineseChars.join(''), {
      style: pinyin.STYLE_NORMAL,
      heteronym: false
    });
    
    const noTone = pinyinArray.flat().join('').toLowerCase();
    const initial = pinyinArray.flat().map(p => p[0]).join('').toLowerCase();
    
    return { noTone, initial };
  }
  
  /**
   * 包含关系
   */
  private static calculateContainsScore(str1: string, str2: string): number {
    if (str1.includes(str2) || str2.includes(str1)) {
      const shorterLen = Math.min(str1.length, str2.length);
      const longerLen = Math.max(str1.length, str2.length);
      return shorterLen / longerLen;
    }
    return 0;
  }
  
  /**
   * 标准化
   */
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
      .trim();
  }
  
  /**
   * 聚类（音近字优化版）
   */
  static cluster(names: string[], threshold: number = 0.60): string[][] {
    const clusters: string[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < names.length; i++) {
      if (processed.has(i)) continue;
      
      const cluster = [names[i]];
      processed.add(i);
      
      for (let j = i + 1; j < names.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = this.calculate(names[i], names[j]);
        
        if (similarity >= threshold) {
          cluster.push(names[j]);
          processed.add(j);
        }
      }
      
      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
}

// 导出便捷函数
export function chineseSimilarityV2(name1: string, name2: string): number {
  return ChineseSimilarityV2.calculate(name1, name2);
}

export function clusterChineseNamesV2(names: string[], threshold?: number): string[][] {
  return ChineseSimilarityV2.cluster(names, threshold);
}

