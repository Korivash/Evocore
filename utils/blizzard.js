const axios = require('axios');
const db = require('../database/database');
const logger = require('./logger');

let accessToken = null;
let tokenExpiry = null;

// Get OAuth token
async function getAccessToken() {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    try {
        const response = await axios.post(
            `https://${process.env.BLIZZARD_REGION}.battle.net/oauth/token`,
            'grant_type=client_credentials',
            {
                auth: {
                    username: process.env.BLIZZARD_CLIENT_ID,
                    password: process.env.BLIZZARD_CLIENT_SECRET
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
        
        logger.info('Blizzard API token refreshed');
        return accessToken;
    } catch (error) {
        logger.error('Error getting Blizzard access token:', error.response?.data || error.message);
        throw error;
    }
}

// Make API request with caching
async function makeRequest(endpoint, params = {}, cacheTTL = 60) {
    const cacheKey = `blizzard:${endpoint}:${JSON.stringify(params)}`;
    
    // Check cache first
    const cachedData = await db.getCachedBlizzardData(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    try {
        const token = await getAccessToken();
        const region = process.env.BLIZZARD_REGION || 'us';
        const locale = process.env.BLIZZARD_LOCALE || 'en_US';

        const response = await axios.get(
            `https://${region}.api.blizzard.com${endpoint}`,
            {
                params: {
                    ...params,
                    locale,
                    access_token: token
                }
            }
        );

        // Cache the response
        await db.setCachedBlizzardData(cacheKey, response.data, cacheTTL);

        return response.data;
    } catch (error) {
        logger.error(`Blizzard API error for ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
}

// WoW Character Profile
async function getWoWCharacter(realm, characterName) {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-');
    const nameSlug = characterName.toLowerCase();
    
    return await makeRequest(
        `/profile/wow/character/${realmSlug}/${nameSlug}`,
        { namespace: 'profile-us' },
        30
    );
}

// WoW Character Mythic+ Profile
async function getWoWMythicPlus(realm, characterName) {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-');
    const nameSlug = characterName.toLowerCase();
    
    return await makeRequest(
        `/profile/wow/character/${realmSlug}/${nameSlug}/mythic-keystone-profile`,
        { namespace: 'profile-us' },
        30
    );
}

// WoW Character PvP Summary
async function getWoWPvP(realm, characterName) {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-');
    const nameSlug = characterName.toLowerCase();
    
    return await makeRequest(
        `/profile/wow/character/${realmSlug}/${nameSlug}/pvp-summary`,
        { namespace: 'profile-us' },
        30
    );
}

// WoW Realm Status
async function getWoWRealmStatus(realmSlug) {
    return await makeRequest(
        `/data/wow/realm/${realmSlug}`,
        { namespace: 'dynamic-us' },
        5
    );
}

// WoW Token Price
async function getWoWTokenPrice() {
    return await makeRequest(
        '/data/wow/token/index',
        { namespace: 'dynamic-us' },
        60
    );
}

// Diablo 4 Character Profile
async function getD4Character(battleTag, characterId) {
    const tagSlug = battleTag.replace('#', '-');
    
    return await makeRequest(
        `/profile/user/d4/${tagSlug}/hero/${characterId}`,
        { namespace: 'profile-us' },
        30
    );
}

// Overwatch Player Profile
async function getOverwatchProfile(battleTag) {
    const tagSlug = battleTag.replace('#', '-');
    
    return await makeRequest(
        `/profile/overwatch/account/${tagSlug}`,
        { namespace: 'profile-us' },
        30
    );
}

// Hearthstone Card Search
async function searchHearthstoneCard(cardName) {
    return await makeRequest(
        '/hearthstone/cards',
        {
            namespace: 'static-us',
            locale: 'en_US',
            textFilter: cardName,
            pageSize: 10
        },
        1440 // 24 hours
    );
}

// StarCraft 2 Profile
async function getSC2Profile(regionId, realmId, profileId) {
    return await makeRequest(
        `/sc2/profile/${regionId}/${realmId}/${profileId}`,
        { namespace: 'profile-us' },
        60
    );
}

module.exports = {
    getAccessToken,
    makeRequest,
    getWoWCharacter,
    getWoWMythicPlus,
    getWoWPvP,
    getWoWRealmStatus,
    getWoWTokenPrice,
    getD4Character,
    getOverwatchProfile,
    searchHearthstoneCard,
    getSC2Profile
};
