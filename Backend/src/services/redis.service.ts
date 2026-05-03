import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

let isConnected = false;

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        isConnected = true;
        console.log('Redis connected successfully');
    } catch (error) {
        console.log('Redis connection failed, continuing without cache');
        isConnected = false;
    }
};

export const getCache = async (key: string) => {
    if (!isConnected) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
};

export const setCache = async (key: string, value: any, ttlSeconds = 3600) => {
    if (!isConnected) return;
    await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds
    });
};

export const invalidateCache = async (key: string) => {
    if (!isConnected) return;
    await redisClient.del(key);
};
