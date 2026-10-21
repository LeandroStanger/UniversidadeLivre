import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/video/skin.css';
import '@videojs/html/media/youtube-video';
import '@videojs/html/extensions/google-cast';
import '@videojs/html/i18n';
import '@videojs/html/i18n/locales/pt-BR/register';
import '@videojs/html/i18n/locales/en/register';
import '@videojs/html/i18n/locales/es/register';

export function createCompatibilityAdapter(video) {
    let activeMedia = video;
    let youtubeMedia = null;
    const youtubeSkin = video.closest('video-skin');
    const listeners = new Map();
    const centeredCaptionTracks = new WeakSet();

    function centerCaptionTrack(track) {
        if (typeof track?.addEventListener !== 'function' || centeredCaptionTracks.has(track)) return;
        centeredCaptionTracks.add(track);

        const centerCues = () => {
            const cues = track.cues;
            if (!cues) return;
            for (const cue of cues) {
                cue.align = 'center';
                cue.position = 50;
                cue.positionAlign = 'center';
            }
        };

        centerCues();
        track.addEventListener('cuechange', centerCues);
    }

    function centerCaptionTracks(media) {
        const textTracks = media.textTracks;
        if (!textTracks) return;
        for (const track of textTracks) {
            if (track.kind === 'captions' || track.kind === 'subtitles') {
                centerCaptionTrack(track);
            }
        }
        textTracks.addEventListener('addtrack', event => {
            const track = event.track;
            if (track.kind === 'captions' || track.kind === 'subtitles') {
                centerCaptionTrack(track);
            }
        });
    }

    function removeYouTubeMedia() {
        if (!youtubeMedia) return;
        youtubeMedia.remove();
        youtubeMedia = null;
    }

    function useNative() {
        removeYouTubeMedia();
        activeMedia = video;
        video.hidden = false;
    }

    function useYouTube(source) {
        if (!youtubeSkin) throw new Error('O skin do Video.js não foi encontrado para reproduzir o vídeo do YouTube.');
        removeYouTubeMedia();
        const media = document.createElement('youtube-video');
        media.controls = false;
        media.playsInline = true;
        media.preload = 'metadata';
        Object.assign(media.style, {
            display: 'block',
            width: '100%',
            height: '100%'
        });
        for (const [type, callbacks] of listeners) {
            callbacks.forEach(callback => media.addEventListener(type, callback));
        }
        video.hidden = true;
        youtubeSkin.append(media);
        youtubeMedia = media;
        activeMedia = media;
        centerCaptionTracks(media);
        media.src = source;
        return this;
    }

    centerCaptionTracks(video);

    return {
        on(type, listener) {
            video.addEventListener(type, listener);
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(listener);
            youtubeMedia?.addEventListener(type, listener);
            if (type === 'fullscreenchange') document.addEventListener(type, listener);
            return this;
        },
        one(type, listener) {
            video.addEventListener(type, listener, { once: true });
            youtubeMedia?.addEventListener(type, listener, { once: true });
            if (type === 'fullscreenchange') document.addEventListener(type, listener, { once: true });
            return this;
        },
        ready(listener) {
            queueMicrotask(listener);
            return this;
        },
        useYouTube,
        useNative,
        isYouTube() {
            return activeMedia === youtubeMedia;
        },
        getYouTubeAudioApi() {
            const engine = youtubeMedia?.engine;
            return typeof engine?.getAvailableAudioTracks === 'function'
                && typeof engine?.setAudioTrack === 'function'
                ? engine
                : null;
        },
        reset() {
            video.pause();
            video.removeAttribute('src');
            video.load();
            video.querySelectorAll('source').forEach(sourceElement => sourceElement.remove());
            useNative();
        },
        src(source) {
            useNative();
            video.src = typeof source === 'string' ? source : source.src;
            video.load();
        },
        currentTime(value) {
            if (arguments.length) activeMedia.currentTime = value;
            return activeMedia.currentTime;
        },
        duration() {
            return activeMedia.duration;
        },
        volume(value) {
            if (arguments.length) activeMedia.volume = value;
            return activeMedia.volume;
        },
        muted(value) {
            if (arguments.length) activeMedia.muted = value;
            return activeMedia.muted;
        },
        playbackRate(value) {
            if (arguments.length) activeMedia.playbackRate = value;
            return activeMedia.playbackRate;
        },
        paused() {
            return activeMedia.paused;
        },
        play() {
            return activeMedia.play();
        },
        pause() {
            activeMedia.pause();
        },
        autoplay(value) {
            if (arguments.length) activeMedia.autoplay = value;
            return activeMedia.autoplay;
        },
        controls(value) {
            if (arguments.length) activeMedia.controls = activeMedia === youtubeMedia ? value : false;
            return activeMedia.controls;
        },
        textTracks() {
            return activeMedia.textTracks;
        },
        addRemoteTextTrack(options) {
            const element = document.createElement('track');
            Object.assign(element, options);
            video.appendChild(element);
            return { element, track: element.track };
        },
        removeRemoteTextTrack(remoteTrack) {
            remoteTrack?.element?.remove();
        },
        isFullscreen() {
            if (activeMedia === youtubeMedia) return youtubeMedia.isFullscreen;
            const fullscreenElement = document.fullscreenElement;
            return Boolean(fullscreenElement && (fullscreenElement === video || fullscreenElement.contains(video)));
        },
        requestFullscreen() {
            return activeMedia === youtubeMedia
                ? youtubeMedia.requestFullscreen()
                : (video.closest('video-player') || video).requestFullscreen();
        },
        exitFullscreen() {
            return activeMedia === youtubeMedia
                ? youtubeMedia.exitFullscreen()
                : document.exitFullscreen();
        },
        error() {
            return activeMedia.error;
        },
        focus() {
            activeMedia.focus();
        }
    };
}
