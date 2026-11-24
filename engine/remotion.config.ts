import {Config} from '@remotion/cli/config';

// Studio / CLI ayarları. SSR render (render.mjs) kendi seçeneklerini geçer.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(4);
