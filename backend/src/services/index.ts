import { TwitterMonitor } from './twitter-monitor';
import { ChainDataService } from './chain-data';
import { MatchingEngine } from './matching-engine';
import { logger } from '../utils/logger';
import cron from 'node-cron';

let twitterMonitor: TwitterMonitor;
let chainDataService: ChainDataService;
let matchingEngine: MatchingEngine;

export async function initializeServices() {
  logger.info('Initializing services...');
  
  // Initialize chain data service
  chainDataService = new ChainDataService();
  
  // Initialize matching engine
  matchingEngine = new MatchingEngine(chainDataService);
  
  // Initialize Twitter monitor
  twitterMonitor = new TwitterMonitor(matchingEngine);
  
  // Schedule jobs
  scheduleJobs();
  
  logger.info('Services initialized successfully');
}

function scheduleJobs() {
  // Poll Twitter every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running Twitter poll job');
    try {
      await twitterMonitor.pollKOLTweets();
    } catch (error) {
      logger.error('Twitter poll job failed:', error);
    }
  });
  
  // Update market data every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    logger.info('Running market data update job');
    try {
      await chainDataService.updateActiveTokens();
    } catch (error) {
      logger.error('Market data update job failed:', error);
    }
  });
  
  logger.info('Cron jobs scheduled');
}

export { twitterMonitor, chainDataService, matchingEngine };

