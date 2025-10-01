const fs = require('fs');
const path = require('path');
const Channel = require('../models/Channel');
const { clear } = require('console');

const storageFilePath = path.resolve('./data/channels/channels.json');

module.exports = {
    load() {

        // Default example channels - OUTDATED!
        const daddyHeaders = [
            { "key": "Origin", "value": "https://cookiewebplay.xyz" },
            { "key": "User-Agent", "value": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" },
            { "key": "Referer", "value": "https://cookiewebplay.xyz/" }
        ];

        const streamedSuHeaders = [
            { "key": "Origin", "value": "https://embedme.top" },
            { "key": "User-Agent", "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0" },
            { "key": "Referer", "value": "https://embedme.top/" }
        ];

        const defaultChannels = [
            //Some Test-channels from daddylive to get started, remove this when using your own playlist
            new Channel('ACC Network', "http://fl2.moveonjoy.com/ACC_NETWORK/index.m3u8", "https://github.com/tv-logo/tv-logos/blob/main/countries/united-states/acc-network-us.png?raw=true", "proxy",[]),
            new Channel('BeIn Sports', "http://fl2.moveonjoy.com/BEIN_SPORTS/index.m3u8", "https://github.com/tv-logo/tv-logos/blob/main/countries/united-states/bein-sports-us.png?raw=true", "proxy",[]),
            // new Channel('NBA 1', "http://fl5.moveonjoy.com/NBA_1/index.m3u8", "https://github.com/tv-logo/tv-logos/blob/main/countries/united-states/nba-tv-icon-us.png?raw=true", "proxy",[]),

            // new Channel('beIN Sports 1', "https://m3u-playlist-proxy-wine.vercel.app?url=https%3A%2F%2Fdokko1new.koskoros.ru%2Fdokko1%2Fpremium91%2Fmono.m3u8&data=UmVmZXJlcj1odHRwczovL2Rva29wbGF5Lnh5ei98T3JpZ2luPWh0dHBzOi8vZG9rb3BsYXkueHl6", "https://seeklogo.com/images/B/bein-sports-1-logo-4E5E4AE6B8-seeklogo.com.png", 'direct'),
            // new Channel('DAZN 1 DE', "https://m3u-playlist-proxy-wine.vercel.app?url=https%3A%2F%2Fddy6new.koskoros.ru%2Fddy6%2Fpremium426%2Fmono.m3u8&data=UmVmZXJlcj1odHRwczovL2Rva29wbGF5Lnh5ei98T3JpZ2luPWh0dHBzOi8vZG9rb3BsYXkueHl6", "https://upload.wikimedia.org/wikipedia/commons/4/49/DAZN_1.svg", 'direct'),
            // new Channel('DAZN 2 DE', "https://m3u-playlist-proxy-wine.vercel.app?url=https%3A%2F%2Fddy6new.koskoros.ru%2Fddy6%2Fpremium427%2Fmono.m3u8&data=UmVmZXJlcj1odHRwczovL2Rva29wbGF5Lnh5ei98T3JpZ2luPWh0dHBzOi8vZG9rb3BsYXkueHl6", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/DAZN_2.svg/2560px-DAZN_2.svg.png", 'direct'),
            // new Channel('Sky Sport Football', "https://m3u-playlist-proxy-wine.vercel.app?url=https%3A%2F%2Fzekonew.koskoros.ru%2Fzeko%2Fpremium35%2Fmono.m3u8&data=UmVmZXJlcj1odHRwczovL2Rva29wbGF5Lnh5ei98T3JpZ2luPWh0dHBzOi8vZG9rb3BsYXkueHl6", "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-football-uk.png", 'direct'),
            // new Channel('Sky Sports Premier League', "https://m3u-playlist-proxy-wine.vercel.app?url=https%3A%2F%2Fdokko1new.koskoros.ru%2Fdokko1%2Fpremium130%2Fmono.m3u8&data=UmVmZXJlcj1odHRwczovL2Rva29wbGF5Lnh5ei98T3JpZ2luPWh0dHBzOi8vZG9rb3BsYXkueHl6", "https://github.com/tv-logo/tv-logos/blob/main/countries/united-kingdom/sky-sports-premier-league-uk.png?raw=true", 'direct'),
            // new Channel('SuperSport La Liga', 'https://m3u-playlist-proxy-wine.vercel.app?url=https%3A%2F%2Fddy6new.koskoros.ru%2Fddy6%2Fpremium415%2Fmono.m3u8&data=UmVmZXJlcj1odHRwczovL2Rva29wbGF5Lnh5ei98T3JpZ2luPWh0dHBzOi8vZG9rb3BsYXkueHl6', "https://www.dstv.com/media/fsmkqhfo/ss_laliga.png?width=330", 'direct'),
        ];

        // const defaultChannels = [
        //     //Some Test-channels to get started, remove this when using your own playlist
        //     //new Channel('Das Erste', "https://mcdn.daserste.de/daserste/de/master.m3u8", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Das_Erste-Logo_klein.svg/768px-Das_Erste-Logo_klein.svg.png", 'direct'),
        //     new Channel('DAZN 1 DE', "https://ddy6new.iosplayer.ru/ddy6/premium426/mono.m3u8", "https://upload.wikimedia.org/wikipedia/commons/4/49/DAZN_1.svg", 'proxy', daddyHeaders),
        //     new Channel('beIN Sports 1', "https://windnew.koskoros.ru/wind/premium61/mono.m3u8", "https://seeklogo.com/images/B/bein-sports-1-logo-4E5E4AE6B8-seeklogo.com.png", 'proxy', daddyHeaders),
        //     new Channel('beIN Sports 2', "https://zekonew.koskoros.ru/zeko/premium90/mono.m3u8", "https://r2.thesportsdb.com/images/media/channel/logo/BeIn_Sports_HD_2_France.png", 'proxy', daddyHeaders),
        //     new Channel('Sky Sport Football', "https://zekonew.koskoros.ru/zeko/premium35/mono.m3u8", "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-football-uk.png", 'proxy', daddyHeaders),
        //     new Channel('Sky Sports Premier League', "https://dokko1new.koskoros.ru/dokko1/premium130/mono.m3u8", "https://github.com/tv-logo/tv-logos/blob/main/countries/united-kingdom/sky-sports-premier-league-uk.png?raw=true", 'proxy', daddyHeaders),
        //     new Channel('SuperSport La Liga', 'https://ddy6new.koskoros.ru/ddy6/premium415/mono.m3u8', "https://www.dstv.com/media/fsmkqhfo/ss_laliga.png?width=330", 'restream', daddyHeaders),
        //     //new Channel('TEST', 'https://rr.vipstreams.in/alpha/js/al-taawon-vs-al-qadisiya/1/playlist.m3u8', "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Das_Erste-Logo_klein.svg/768px-Das_Erste-Logo_klein.svg.png", 'restream', streamedSuHeaders),
        // ];


        // Ensure the directory exists
        const storageDir = path.dirname(storageFilePath);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        if (fs.existsSync(storageFilePath)) {
            try {
                const data = fs.readFileSync(storageFilePath, 'utf-8');
                const channelsJson = JSON.parse(data);

                return channelsJson.map(channelJson => Channel.from(channelJson));
            } catch (err) {
                console.error('Error loading data from storage:', err);
                return defaultChannels;
            }
        }

        console.log('No channels.json found, creating default channels...');
        this.save(defaultChannels);
        return defaultChannels;
    },

    save(data) {
        try {
            fs.writeFile(storageFilePath, JSON.stringify(data, null, 2), { encoding: 'utf-8' }, (err) => err && console.error(err));
            console.log('Data saved successfully.');
        } catch (err) {
            console.error('Error saving data to storage:', err);
        }
    },

    clear() {
        try {
            fs.unlinkSync(storageFilePath);
            console.log('Data cleared successfully.');
        } catch (err) {
            console.error('Error clearing data from storage:', err);
        }
    }
}