const StreamedSuSession = require('./StreamedSuSession');

class SessionFactory {
    static getSessionProvider(channel) {
        switch (true) {
            case channel.url.includes('vipstreams.in'): //StreamedSU
                return new StreamedSuSession(channel);
            default:
                return null;
        }
    }
}
  
module.exports = SessionFactory;