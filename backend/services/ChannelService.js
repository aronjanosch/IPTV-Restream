const streamController = require('./restream/StreamController');
const Channel = require('../models/Channel');
const storageService = require('./restream/StorageService');
const ChannelStorage = require('./ChannelStorage');

const STOP_GRACE_MS = 10_000;

class ChannelService {
    constructor() {
        this.channels = ChannelStorage.load();
        this.currentChannel = this.channels[0];
        this.activeViewers = 0;
        this.streamActive = false;
        this.stopTimer = null;
    }

    clearChannels() {
        ChannelStorage.clear();
        this.channels = ChannelStorage.load();
        this.currentChannel = this.channels[0];
    }

    getChannels() {
        return this.channels;
    }

    getChannelById(id) {
        return this.channels.find(channel => channel.id === id);
    }

    getFilteredChannels({ playlistName, group }) {
        let filtered = this.channels;
        if (playlistName) {
            filtered = filtered.filter(ch => ch.playlistName && ch.playlistName.toLowerCase() == playlistName.toLowerCase());
        }
        if (group) {
            filtered = filtered.filter(ch => ch.group && ch.group.toLowerCase() === group.toLowerCase());
        }
        return filtered;
    }

    addChannel({ name, url, avatar, mode, headersJson, group = null, playlist = null, playlistName = null, playlistUpdate = false }, save = true) {
        let headers = headersJson;
        try {
            // Try to parse headers if not already parsed
            headers = JSON.parse(headersJson);
        } catch (error) {
        }

        const newChannel = new Channel(name, url, avatar, mode, headers, group, playlist, playlistName, playlistUpdate);
        this.channels.push(newChannel);
        if (save) ChannelStorage.save(this.channels);

        return newChannel;
    }

    async setCurrentChannel(id) {
        const nextChannel = this.channels.find(channel => channel.id === id);
        if (!nextChannel) {
            throw new Error('Channel does not exist');
        }

        let streamStarted = false;
        if (this.currentChannel !== nextChannel) {
            if (this.stopTimer) {
                clearTimeout(this.stopTimer);
                this.stopTimer = null;
            }

            if (nextChannel.restream()) {
                streamController.stop(this.currentChannel);
                storageService.deleteChannelStorage(nextChannel.id);

                // Only start streaming if we have active viewers
                if (this.activeViewers > 0) {
                    await streamController.start(nextChannel);
                    this.streamActive = true;
                    streamStarted = true;
                } else {
                    console.log('No active viewers. Stream will start when viewers connect.');
                    this.streamActive = false;
                }
            } else {
                streamController.stop(this.currentChannel);
                this.streamActive = false;
            }
            this.currentChannel = nextChannel;
        }
        return { channel: nextChannel, streamStarted };
    }

    async viewerConnected() {
        this.activeViewers++;
        console.log(`Viewer connected. Active viewers: ${this.activeViewers}`);

        if (this.stopTimer) {
            console.log('Viewer reconnected during grace period. Cancelling pending stop.');
            clearTimeout(this.stopTimer);
            this.stopTimer = null;
        }

        if (this.currentChannel.restream() && !this.streamActive) {
            console.log('Viewer connected, starting stream for:', this.currentChannel.name);
            await streamController.start(this.currentChannel);
            this.streamActive = true;
            return true;
        }

        return false;
    }

    async viewerDisconnected() {
        if (this.activeViewers > 0) {
            this.activeViewers--;
        }
        console.log(`Viewer disconnected. Active viewers: ${this.activeViewers}`);

        if (this.activeViewers === 0 && this.currentChannel.restream() && this.streamActive) {
            const channelToStop = this.currentChannel;
            console.log(`No active viewers. Stopping stream for ${channelToStop.name} in ${STOP_GRACE_MS}ms grace period...`);

            if (this.stopTimer) clearTimeout(this.stopTimer);

            return new Promise((resolve) => {
                this.stopTimer = setTimeout(async () => {
                    this.stopTimer = null;

                    if (this.activeViewers > 0 || this.currentChannel !== channelToStop || !this.streamActive) {
                        console.log('Viewer reconnected or channel changed during grace period. Skipping stop.');
                        resolve(false);
                        return;
                    }

                    console.log('Grace period elapsed. Stopping stream for:', channelToStop.name);
                    await streamController.stop(channelToStop);
                    this.streamActive = false;
                    resolve(true);
                }, STOP_GRACE_MS);
            });
        }

        return false;
    }

    getCurrentChannel() {
        return this.currentChannel;
    }

    async deleteChannel(id, save = true) {
        const channelIndex = this.channels.findIndex(channel => channel.id === id);
        if (channelIndex === -1) {
            throw new Error('Channel does not exist');
        }

        const [deletedChannel] = this.channels.splice(channelIndex, 1);

        if (this.currentChannel.id === id) {
            const next = this.channels[0];
            if (next) await this.setCurrentChannel(next.id);
            else this.currentChannel = null;
        }

        if (save) ChannelStorage.save(this.channels);

        return this.currentChannel;
    }

    async updateChannel(id, updatedAttributes, save = true) {
        const channelIndex = this.channels.findIndex(channel => channel.id === id);
        if (channelIndex === -1) {
            throw new Error('Channel does not exist');
        }

        const streamChanged = updatedAttributes.url != this.currentChannel.url ||
            JSON.stringify(updatedAttributes.headers) != JSON.stringify(this.currentChannel.headers) ||
            updatedAttributes.mode != this.currentChannel.mode;

        const channel = this.channels[channelIndex];
        Object.assign(channel, updatedAttributes);

        if (this.currentChannel.id == id) {
            if (streamChanged) {
                streamController.stop(channel);
                this.streamActive = false;

                // Only start streaming if we have active viewers
                if (channel.restream() && this.activeViewers > 0) {
                    await streamController.start(channel);
                    this.streamActive = true;
                }
            }
        }

        if (save) ChannelStorage.save(this.channels);

        return channel;
    }
}

module.exports = new ChannelService();