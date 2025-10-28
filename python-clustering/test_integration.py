import os
import requests
import json

def test_clustering():
    """测试聚类服务"""
    
    test_data = {
        "tokens": [
            {
                "mint_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "name": "狗狗币",
                "symbol": "DOGE",
                "decimals": 9
            },
            {
                "mint_address": "CMZYPASGWeTGr7j4H9nC5WkZ9j15cVZrC7nCUJTM6S6Q",
                "name": "Shiba Inu", 
                "symbol": "SHIB",
                "decimals": 9
            },
            {
                "mint_address": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
                "name": "青蛙币",
                "symbol": "FROG",
                "decimals": 9
            },
            {
                "mint_address": "6cVgPqVZ6GfJQzXpzXpzXpzXpzXpzXpzXpzXpzXpzXp",
                "name": "Moon Coin",
                "symbol": "MOON", 
                "decimals": 9
            }
        ]
    }
    
    base_url = os.environ.get("CLUSTER_SERVICE_URL", "http://localhost:8000")
    url = base_url.rstrip("/") + "/cluster"

    # Print the resolved URL for debugging / CI visibility
    print(f"Using cluster service URL: {url}")

    try:
        response = requests.post(
            url,
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 聚类测试成功!")
            print(f"找到 {result['total_topics']} 个主题")
            
            for cluster in result['clusters']:
                print(f"\n🎯 主题: {cluster['topic_name']}")
                print(f"   置信度: {cluster['confidence_score']:.3f}")
                print(f"   关键词: {', '.join(cluster['keywords'][:3])}")
                print(f"   代币数量: {len(cluster['tokens'])}")
                print(f"   主题类型: {cluster.get('cluster_info', {}).get('themes', [])}")
                
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    test_clustering()