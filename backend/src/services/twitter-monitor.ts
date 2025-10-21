import { TwitterApi, TweetV2 } from 'twitter-api-v2';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { MatchingEngine } from './matching-engine';
import { io } from '../index';
import natural from 'natural';

const TfIdf = natural.TfIdf;

export class TwitterMonitor {
  private client: TwitterApi;
  private matchingEngine: MatchingEngine;
  
  constructor(matchingEngine: MatchingEngine) {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      throw new Error('TWITTER_BEARER_TOKEN is required');
    }
    
    this.client = new TwitterApi(bearerToken);
    this.matchingEngine = matchingEngine;
  }
  
  /**
   * Poll KOL tweets
   */
  async pollKOLTweets() {
    const kols = await prisma.kOL.findMany({
      where: { isActive: true }
    });
    
    if (kols.length === 0) {
      logger.warn('No active KOLs found');
      return;
    }
    
    logger.info(`Polling tweets for ${kols.length} KOLs`);
    
    for (const kol of kols) {
      try {
        await this.pollKOLTweetsById(kol.id, kol.twitterId, kol.lastTweetId || undefined);
      } catch (error) {
        logger.error(`Failed to poll tweets for KOL ${kol.twitterHandle}:`, error);
      }
    }
  }
  
  /**
   * Poll tweets for a specific KOL
   */
  private async pollKOLTweetsById(kolId: number, twitterId: string, sinceId?: string) {
    try {
      const timeline = await this.client.v2.userTimeline(twitterId, {
        max_results: 10,
        since_id: sinceId,
        'tweet.fields': ['created_at', 'public_metrics'],
        exclude: ['retweets', 'replies']
      });
      
      if (!timeline.data || timeline.data.data.length === 0) {
        logger.debug(`No new tweets for KOL ${twitterId}`);
        return;
      }
      
      const tweets = timeline.data.data;
      logger.info(`Found ${tweets.length} new tweets for KOL ${twitterId}`);
      
      // Process tweets in reverse order (oldest first)
      for (const tweet of tweets.reverse()) {
        await this.processTweet(tweet, kolId);
      }
      
      // Update last tweet ID
      const latestTweetId = tweets[tweets.length - 1].id;
      await prisma.kOL.update({
        where: { id: kolId },
        data: { lastTweetId: latestTweetId }
      });
      
    } catch (error: any) {
      if (error.code === 429) {
        logger.warn('Twitter API rate limit exceeded');
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Process a single tweet
   */
  private async processTweet(tweet: TweetV2, kolId: number) {
    // Check if tweet already exists
    const existing = await prisma.tweet.findUnique({
      where: { tweetId: tweet.id }
    });
    
    if (existing) {
      logger.debug(`Tweet ${tweet.id} already processed`);
      return;
    }
    
    const content = tweet.text || '';
    const keywords = this.extractKeywords(content);
    const hotScore = this.calculateHotScore(tweet);
    
    // Save tweet
    const savedTweet = await prisma.tweet.create({
      data: {
        tweetId: tweet.id,
        kolId,
        content,
        keywords,
        hotScore,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        tweetCreatedAt: tweet.created_at ? new Date(tweet.created_at) : new Date()
      }
    });
    
    logger.info(`Saved tweet ${tweet.id} with hot score ${hotScore}`);
    
    // Process keywords and create/update hot topics
    for (const keyword of keywords) {
      await this.processHotTopic(keyword, savedTweet.id);
    }
    
    // Broadcast new tweet
    io.to('hot-topics').emit('new_tweet', {
      tweet: savedTweet,
      keywords
    });
  }
  
  /**
   * Extract keywords from tweet text
   */
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // Extract hashtags
    const hashtags = text.match(/#(\w+)/g) || [];
    keywords.push(...hashtags.map(h => h.slice(1).toLowerCase()));
    
    // Extract cashtags
    const cashtags = text.match(/\$(\w+)/g) || [];
    keywords.push(...cashtags.map(c => c.slice(1).toLowerCase()));
    
    // TF-IDF for other important words
    const tfidf = new TfIdf();
    const cleanText = text.replace(/[#$@]/g, ' ').toLowerCase();
    tfidf.addDocument(cleanText);
    
    const terms = tfidf.listTerms(0);
    for (const term of terms.slice(0, 5)) {
      if (term.tfidf > 0.1 && term.term.length > 3) {
        keywords.push(term.term);
      }
    }
    
    // Deduplicate
    return [...new Set(keywords)];
  }
  
  /**
   * Calculate hot score for a tweet
   */
  private calculateHotScore(tweet: TweetV2): number {
    const metrics = tweet.public_metrics;
    if (!metrics) return 0;
    
    const likes = metrics.like_count || 0;
    const retweets = metrics.retweet_count || 0;
    const replies = metrics.reply_count || 0;
    
    // Weighted score
    return likes * 1 + retweets * 3 + replies * 2;
  }
  
  /**
   * Process hot topic
   */
  private async processHotTopic(keyword: string, tweetId: number) {
    // Find or create hot topic
    let topic = await prisma.hotTopic.findFirst({
      where: { keyword }
    });
    
    const now = new Date();
    
    if (!topic) {
      topic = await prisma.hotTopic.create({
        data: {
          keyword,
          totalMentions: 1,
          hotScore: 1,
          firstSeenAt: now,
          lastSeenAt: now
        }
      });
      
      logger.info(`Created new hot topic: ${keyword}`);
      
      // Trigger matching
      await this.matchingEngine.matchTopic(topic.id);
      
      // Broadcast new topic
      io.to('hot-topics').emit('new_topic', topic);
    } else {
      // Update existing topic
      const newHotScore = topic.hotScore + 1;
      const newMentions = topic.totalMentions + 1;
      
      topic = await prisma.hotTopic.update({
        where: { id: topic.id },
        data: {
          totalMentions: newMentions,
          hotScore: newHotScore,
          lastSeenAt: now
        }
      });
      
      logger.info(`Updated hot topic: ${keyword} (mentions: ${newMentions})`);
    }
    
    // Link topic to tweet
    await prisma.topicTweet.create({
      data: {
        topicId: topic.id,
        tweetId
      }
    }).catch(() => {
      // Ignore duplicate key errors
    });
  }
}

