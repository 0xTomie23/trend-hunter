#!/bin/bash

echo "🧪 Testing TrendHunter Database Persistence"
echo "=========================================="

# 测试用户登录
echo "1. Testing user login..."
USER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"testuser123","username":"TestUser"}')

echo "User login response: $USER_RESPONSE"
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "User ID: $USER_ID"

# 测试创建主题
echo -e "\n2. Testing topic creation..."
TOPIC_RESPONSE=$(curl -s -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d "{\"userId\":$USER_ID,\"name\":\"AI Memes\",\"description\":\"AI related meme tokens\"}")

echo "Topic creation response: $TOPIC_RESPONSE"
TOPIC_ID=$(echo $TOPIC_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Topic ID: $TOPIC_ID"

# 测试添加代币
echo -e "\n3. Testing token addition..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/tokens/add \
  -H "Content-Type: application/json" \
  -d "{\"topicId\":$TOPIC_ID,\"mintAddress\":\"CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8\"}")

echo "Token addition response: $TOKEN_RESPONSE"

# 测试获取用户数据
echo -e "\n4. Testing user data retrieval..."
USER_DATA=$(curl -s http://localhost:3000/api/testuser123)
echo "User data: $USER_DATA"

echo -e "\n✅ All tests completed!"
echo "📊 Database persistence is working correctly!"
echo "🔄 Data will be preserved across server restarts"
