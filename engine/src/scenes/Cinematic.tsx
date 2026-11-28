import React from 'react';
import {OffthreadVideo, staticFile} from 'remotion';

export const Cinematic: React.FC<{src: string}> = ({src}) => (
  <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%'}} />
);
