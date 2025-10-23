const axios = require('axios');
const db = require('../database/database');
const logger = require('./logger');

let cachedToken = null;
let tokenExpiry = 0;

// Get OAuth token using Bearer authentication
async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const oauthUrl = process.env.BLIZZARD_OAUTH_URL || `https://${process.env.BLIZZARD_REGION || 'us'}.battle.net/oauth/token`;

    try {
        logger.info(`Requesting Blizzard token from: ${oauthUrl}`);

        const response = await axios.post(
            oauthUrl,
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(
                        `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
                    ).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }
        );

        cachedToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

        logger.info(`Blizzard API token acquired (valid for ${response.data.expires_in}s)`);
        
        return cachedToken;
    } catch (error) {
        logger.error('Error getting Blizzard access token:', error.response?.data || error.message);
        throw error;
    }
}

// Make API request with Bearer authentication and caching
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

        // Build URL with query params
        const url = `https://${region}.api.blizzard.com${endpoint}`;
        const queryParams = new URLSearchParams({
            ...params,
            locale
        });

        logger.info(`Fetching: ${url}?${queryParams}`);

        const response = await axios.get(`${url}?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}` // Use Bearer token in header, not query param
            }
        });

        // Cache the response
        await db.setCachedBlizzardData(cacheKey, response.data, cacheTTL);

        return response.data;
    } catch (error) {
        logger.error(`Blizzard API error for ${endpoint}:`, error.response?.status, error.response?.statusText);
        throw error;
    }
}

// WoW Character Profile
async function getWoWCharacter(realm, characterName) {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const nameSlug = characterName.toLowerCase();
    const region = process.env.BLIZZARD_REGION || 'us';
    
    try {
        const profileData = await makeRequest(
            `/profile/wow/character/${realmSlug}/${nameSlug}`,
            { namespace: `profile-${region}` },
            30
        );

        logger.info(`Profile fetched for ${characterName}-${realm}`);

        // Try to get M+ data
        try {
            const keystoneData = await makeRequest(
                `/profile/wow/character/${realmSlug}/${nameSlug}/mythic-keystone-profile`,
                { namespace: `profile-${region}` },
                30
            );
            
            return {
                ...profileData,
                mythic_keystone_profile: keystoneData
            };
        } catch (keystoneError) {
            logger.warn(`No M+ data for ${characterName}-${realm}`);
            return {
                ...profileData,
                mythic_keystone_profile: null
            };
        }
    } catch (error) {
        // Try with encoded name if it fails
        const encodedName = encodeURIComponent(nameSlug);
        if (encodedName !== nameSlug) {
            logger.info(`Retrying with encoded name: ${encodedName}`);
            
            const profileData = await makeRequest(
                `/profile/wow/character/${realmSlug}/${encodedName}`,
                { namespace: `profile-${region}` },
                30
            );

            try {
                const keystoneData = await makeRequest(
                    `/profile/wow/character/${realmSlug}/${encodedName}/mythic-keystone-profile`,
                    { namespace: `profile-${region}` },
                    30
                );
                
                return {
                    ...profileData,
                    mythic_keystone_profile: keystoneData
                };
            } catch (keystoneError) {
                return {
                    ...profileData,
                    mythic_keystone_profile: null
                };
            }
        }
        
        throw error;
    }
}

// WoW Character Mythic+ Profile
async function getWoWMythicPlus(realm, characterName) {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const nameSlug = characterName.toLowerCase();
    const region = process.env.BLIZZARD_REGION || 'us';
    
    return await makeRequest(
        `/profile/wow/character/${realmSlug}/${nameSlug}/mythic-keystone-profile`,
        { namespace: `profile-${region}` },
        30
    );
}

// WoW Character PvP Summary
async function getWoWPvP(realm, characterName) {
    const realmSlug = realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    const nameSlug = characterName.toLowerCase();
    const region = process.env.BLIZZARD_REGION || 'us';
    
    return await makeRequest(
        `/profile/wow/character/${realmSlug}/${nameSlug}/pvp-summary`,
        { namespace: `profile-${region}` },
        30
    );
}

// WoW Realm Status
async function getWoWRealmStatus(realmSlug) {
    const region = process.env.BLIZZARD_REGION || 'us';
    const cleanRealmSlug = realmSlug.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    
    return await makeRequest(
        `/data/wow/realm/${cleanRealmSlug}`,
        { namespace: `dynamic-${region}` },
        5
    );
}

// WoW Token Price
async function getWoWTokenPrice() {
    const region = process.env.BLIZZARD_REGION || 'us';
    
    try {
        // Try the main token endpoint
        return await makeRequest(
            '/data/wow/token/',
            { namespace: `dynamic-${region}` },
            60
        );
    } catch (error) {
        // If that fails, try the index endpoint
        try {
            return await makeRequest(
                '/data/wow/token/index',
                { namespace: `dynamic-${region}` },
                60
            );
        } catch (retryError) {
            logger.error('WoW Token endpoint not available');
            throw new Error('WoW Token data is currently unavailable for your region.');
        }
    }
}

// Diablo 4 Character Profile
async function getD4Character(battleTag, characterId) {
    const tagSlug = battleTag.replace('#', '-');
    const region = process.env.BLIZZARD_REGION || 'us';
    
    return await makeRequest(
        `/profile/user/d4/${tagSlug}/hero/${characterId}`,
        { namespace: `profile-${region}` },
        30
    );
}

// Overwatch Player Profile  
async function getOverwatchProfile(battleTag) {
    const tagSlug = battleTag.replace('#', '-');
    const region = process.env.BLIZZARD_REGION || 'us';
    
    return await makeRequest(
        `/profile/overwatch/account/${tagSlug}`,
        { namespace: `profile-${region}` },
        30
    );
}

// Hearthstone Card Search
async function searchHearthstoneCard(cardName) {
    const region = process.env.BLIZZARD_REGION || 'us';
    
    return await makeRequest(
        '/hearthstone/cards',
        {
            namespace: `static-${region}`,
            textFilter: cardName,
            pageSize: 10
        },
        1440 // 24 hours
    );
}

// StarCraft 2 Profile
async function getSC2Profile(regionId, realmId, profileId) {
    const region = process.env.BLIZZARD_REGION || 'us';
    
    return await makeRequest(
        `/sc2/profile/${regionId}/${realmId}/${profileId}`,
        { namespace: `profile-${region}` },
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
