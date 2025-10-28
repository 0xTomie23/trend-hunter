#!/usr/bin/env python
# coding: utf-8

# In[1]:


import re
import joblib
import numpy as np
from typing import List, Dict
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter
import jieba

class MemeCoinClassifier:
    def __init__(self, model_path: str = "text_only_meme_classifier.pkl"):
        """
        加载预训练的 Meme 币分类模型
        """
        try:
            self.model_package = joblib.load(model_path)
            self.vectorizer = self.model_package['vectorizer']
            self.kmeans = self.model_package['kmeans']
            self.cluster_descriptions = self.model_package['cluster_descriptions']
            self.metadata = self.model_package['metadata']
            print(f"✅ 模型加载成功: {self.metadata['model_type']}")
        except Exception as e:
            print(f"❌ 模型加载失败: {e}")
            raise

    def preprocess_text(self, text: str) -> str:
        """预处理文本，支持中英文，统一处理空格"""
        if not text:
            return ""
        
        text = str(text).lower().strip()
        # 移除所有空格（包括中文之间的空格），避免 "索拉拉" 和 "索 拉拉" 被识别为不同
        text = text.replace(' ', '')
        text = re.sub(r'[^\w\u4e00-\u9fa5]', '', text)
        
        # 中文分词
        if any('\u4e00' <= char <= '\u9fa5' for char in text):
            text = ' '.join(jieba.cut(text))
            
        return text.strip()

    def predict_single(self, name: str, symbol: str) -> Dict:
        """
        预测单个币种的类别
        """
        # 预处理文本
        name_processed = self.preprocess_text(name)
        symbol_processed = self.preprocess_text(symbol)
        combined_text = f"{name_processed} {symbol_processed}"
        
        # 向量化
        text_vector = self.vectorizer.transform([combined_text])
        
        # 预测类别
        cluster_id = self.kmeans.predict(text_vector)[0]
        
        # 计算置信度
        distances = self.kmeans.transform(text_vector)
        min_distance = distances[0, cluster_id]
        confidence = max(0, 1 - (min_distance / (np.mean(distances[0]) + 1e-8)))
        
        # 获取聚类信息
        cluster_info = self.cluster_descriptions.get(cluster_id, {})
        
        return {
            'cluster_id': int(cluster_id),
            'cluster_name': cluster_info.get('themes', ['未知主题'])[0] if cluster_info.get('themes') else '未知主题',
            'keywords': cluster_info.get('common_words', [])[:5],
            'confidence': float(confidence),
            'themes': cluster_info.get('themes', []),
            'description': " + ".join(cluster_info.get('themes', [])) or "混合主题"
        }

    def predict_batch(self, tokens: List[Dict]) -> List[Dict]:
        """
        批量预测币种类别
        """
        results = []
        
        for token in tokens:
            prediction = self.predict_single(token['name'], token['symbol'])
            results.append({
                'token_data': token,
                'prediction': prediction
            })
        
        return results

# 全局模型实例
_classifier = None

def get_classifier():
    """获取分类器实例（单例模式）"""
    global _classifier
    if _classifier is None:
        _classifier = MemeCoinClassifier()
    return _classifier

def preprocess_text(text: str) -> str:
    """预处理文本：清理、去重"""
    text = re.sub(r'[^\w\s\u4e00-\u9fa5]', '', text)
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_keywords(texts: List[str], min_word_length: int = 2) -> List[str]:
    """提取关键词"""
    words = []
    for text in texts:
        # 中文字符
        chinese_chars = re.findall(r'[\u4e00-\u9fa5]+', text)
        words.extend(chinese_chars)
        
        # 英文单词
        english_words = re.findall(r'[a-zA-Z]+', text)
        words.extend([w.lower() for w in english_words if len(w) >= min_word_length])
    
    # 统计词频
    word_freq = Counter(words)
    
    # 返回频率最高的词
    top_words = [word for word, count in word_freq.most_common(10)]
    return top_words

def cluster_tokens(tokens: List[Dict], eps: float = 0.3, min_samples: int = 2) -> List[Dict]:
    """
    对代币进行聚类 - 使用预训练模型
    
    Args:
        tokens: 代币列表，每个包含 name 和 symbol
        eps: 未使用（保持接口兼容）
        min_samples: 未使用（保持接口兼容）
    
    Returns:
        聚类结果列表
    """
    try:
        # 获取分类器
        classifier = get_classifier()
        
        # 批量预测
        predictions = classifier.predict_batch(tokens)
        
        # 按聚类分组
        clusters = {}
        for pred in predictions:
            cluster_id = pred['prediction']['cluster_id']
            if cluster_id not in clusters:
                clusters[cluster_id] = {
                    'tokens': [],
                    'predictions': []
                }
            clusters[cluster_id]['tokens'].append(pred['token_data'])
            clusters[cluster_id]['predictions'].append(pred['prediction'])
        
        # 构建聚类结果
        results = []
        for cluster_id, cluster_data in clusters.items():
            tokens_in_cluster = cluster_data['tokens']
            predictions_in_cluster = cluster_data['predictions']
            
            # 提取该聚类的关键词
            cluster_texts = [f"{t['name']} {t['symbol']}" for t in tokens_in_cluster]
            keywords = extract_keywords(cluster_texts)
            
            # 计算平均置信度
            avg_confidence = np.mean([p['confidence'] for p in predictions_in_cluster])
            
            # 获取聚类描述
            cluster_info = classifier.cluster_descriptions.get(cluster_id, {})
            cluster_name = cluster_info.get('themes', ['未知主题'])[0] if cluster_info.get('themes') else f'Topic_{cluster_id}'
            
            results.append({
                'topic_id': f'topic_{cluster_id}',
                'topic_name': cluster_name,
                'keywords': keywords,
                'tokens': tokens_in_cluster,
                'similarity_threshold': 0.3,  # 固定值，因为使用预训练模型
                'confidence_score': float(avg_confidence),
                'cluster_info': {
                    'themes': cluster_info.get('themes', []),
                    'common_words': cluster_info.get('common_words', [])[:5],
                    'size': cluster_info.get('size', 0)
                }
            })
        
        # 按置信度排序
        results.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        return results
        
    except Exception as e:
        print(f"聚类失败: {e}")
        # 降级方案：将所有代币放在一个聚类中
        return [{
            'topic_id': 'topic_fallback',
            'topic_name': '混合主题',
            'keywords': extract_keywords([f"{t['name']} {t['symbol']}" for t in tokens]),
            'tokens': tokens,
            'similarity_threshold': 0.0,
            'confidence_score': 0.5,
            'cluster_info': {
                'themes': ['混合'],
                'common_words': [],
                'size': len(tokens)
            }
        }]


# In[ ]:




