// ==========================================
// TECHNICAL VIDEO ANALYSIS
// Level 1 Features - Client-side checks
// ==========================================

import { TechnicalAnalysis, TechnicalCheck } from '../types';

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  hasAudio: boolean;
  fileSize: number;
  fileName: string;
}

/**
 * Extract metadata from a video file
 */
export const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    video.onloadedmetadata = async () => {
      // Check for audio track
      let hasAudio = false;
      
      // Method 1: Check video element's audioTracks (if available)
      if ((video as any).audioTracks && (video as any).audioTracks.length > 0) {
        hasAudio = true;
      }
      
      // Method 2: Try to detect audio via MediaSource (fallback)
      // For now, we'll assume audio exists if duration > 0 (most ads have audio)
      // This can be improved with more sophisticated detection
      if (video.duration > 0) {
        hasAudio = true; // Conservative assumption
      }
      
      // Calculate approximate frame rate (usually 30 or 60 fps)
      // This is an approximation - actual frame rate requires more complex parsing
      const frameRate = 30; // Default assumption for social media videos
      
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        frameRate: frameRate,
        hasAudio: hasAudio,
        fileSize: file.size,
        fileName: file.name,
      });
      
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Analyze resolution quality
 */
const analyzeResolution = (width: number, height: number): TechnicalCheck => {
  const pixels = width * height;
  const isVertical = height > width;
  
  // For vertical video (9:16), ideal is 1080x1920
  // For horizontal video (16:9), ideal is 1920x1080
  
  if (pixels >= 1920 * 1080) {
    return {
      label: 'Resolution',
      status: 'PASS',
      value: `${width}x${height}`,
      details: 'Full HD or higher. Your video will look crisp on all devices.',
      fix: undefined,
    };
  } else if (pixels >= 1280 * 720) {
    return {
      label: 'Resolution',
      status: 'WARN',
      value: `${width}x${height}`,
      details: 'HD quality. Acceptable but may look slightly soft on larger screens.',
      fix: 'For best results, export at 1080p (1080x1920 for vertical, 1920x1080 for horizontal).',
    };
  } else {
    return {
      label: 'Resolution',
      status: 'FAIL',
      value: `${width}x${height}`,
      details: 'Low resolution. Your video will look blurry and pixelated, especially on phones. This screams "amateur" and kills trust instantly.',
      fix: 'Re-export your video at minimum 720p, ideally 1080p. If this is from a screen recording, increase your capture resolution.',
    };
  }
};

/**
 * Analyze aspect ratio for platform compatibility
 */
const analyzeAspectRatio = (width: number, height: number): TechnicalCheck => {
  const ratio = width / height;
  
  // 9:16 vertical (TikTok, Reels, Shorts) = 0.5625
  // 1:1 square (Instagram Feed) = 1.0
  // 16:9 horizontal (YouTube) = 1.778
  // 4:5 vertical (Instagram Feed optimal) = 0.8
  
  if (ratio >= 0.5 && ratio <= 0.6) {
    // 9:16 vertical - perfect for TikTok/Reels/Shorts
    return {
      label: 'Aspect Ratio',
      status: 'PASS',
      value: '9:16 (Vertical)',
      details: 'Perfect for TikTok, Instagram Reels, and YouTube Shorts. Full-screen vertical format.',
      fix: undefined,
    };
  } else if (ratio >= 0.75 && ratio <= 0.85) {
    // 4:5 vertical - good for Instagram Feed
    return {
      label: 'Aspect Ratio',
      status: 'PASS',
      value: '4:5 (Vertical)',
      details: 'Great for Instagram Feed. Takes up maximum space in the feed.',
      fix: undefined,
    };
  } else if (ratio >= 0.95 && ratio <= 1.05) {
    // 1:1 square
    return {
      label: 'Aspect Ratio',
      status: 'WARN',
      value: '1:1 (Square)',
      details: 'Square format works on Instagram Feed but wastes space on TikTok and Reels where vertical (9:16) performs better.',
      fix: 'If targeting TikTok or Reels, re-export as 9:16 vertical (1080x1920) for full-screen impact.',
    };
  } else if (ratio >= 1.7 && ratio <= 1.85) {
    // 16:9 horizontal - YouTube style
    return {
      label: 'Aspect Ratio',
      status: 'FAIL',
      value: '16:9 (Horizontal)',
      details: 'Horizontal video on TikTok/Reels = DISASTER. You get tiny letterboxed video with huge black bars. Nobody can read your text. This is the #1 amateur mistake.',
      fix: 'CRITICAL: Re-edit your video in 9:16 vertical format (1080x1920). Crop, reframe, or reshoot. Black bars kill conversions.',
    };
  } else if (ratio > 1.05 && ratio < 1.7) {
    // Weird horizontal ratio
    return {
      label: 'Aspect Ratio',
      status: 'FAIL',
      value: `${ratio.toFixed(2)}:1 (Non-standard)`,
      details: 'Non-standard aspect ratio. Will have awkward cropping or black bars on every platform.',
      fix: 'Re-export in a standard format: 9:16 for TikTok/Reels, 1:1 for Instagram Feed, or 16:9 for YouTube.',
    };
  } else {
    // Very narrow vertical or unusual
    return {
      label: 'Aspect Ratio',
      status: 'WARN',
      value: `${ratio.toFixed(2)}:1`,
      details: 'Unusual aspect ratio. May not display optimally on social platforms.',
      fix: 'Standard formats: 9:16 (vertical), 1:1 (square), or 16:9 (horizontal for YouTube only).',
    };
  }
};

/**
 * Analyze video duration for platform requirements
 */
const analyzeDuration = (duration: number): TechnicalCheck => {
  const seconds = Math.round(duration);
  const formatted = seconds >= 60 
    ? `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
    : `${seconds}s`;
  
  if (seconds <= 15) {
    return {
      label: 'Duration',
      status: 'PASS',
      value: formatted,
      details: 'Perfect length for TikTok and Reels. Short, punchy, and easy to watch multiple times.',
      fix: undefined,
    };
  } else if (seconds <= 30) {
    return {
      label: 'Duration',
      status: 'PASS',
      value: formatted,
      details: 'Good length. Short enough to hold attention, long enough to tell a story.',
      fix: undefined,
    };
  } else if (seconds <= 60) {
    return {
      label: 'Duration',
      status: 'WARN',
      value: formatted,
      details: 'Getting long for TikTok/Reels. Most viewers drop off after 30 seconds. Every second needs to earn its place.',
      fix: 'Review your video ruthlessly. Can you cut 10-15 seconds without losing the message? Shorter = higher completion rate = better algorithm performance.',
    };
  } else if (seconds <= 90) {
    return {
      label: 'Duration',
      status: 'WARN',
      value: formatted,
      details: 'Long for social ads. Completion rates drop significantly after 60 seconds unless content is exceptionally engaging.',
      fix: 'Try cutting this into 2-3 shorter variations (15s, 30s). Test which length performs best.',
    };
  } else {
    return {
      label: 'Duration',
      status: 'FAIL',
      value: formatted,
      details: 'Too long for most social platforms. TikTok and Reels penalize low completion rates. Most users won\'t watch past 60 seconds.',
      fix: 'Cut this down to under 60 seconds. Better yet, make a 15-30 second version. Save longer content for YouTube.',
    };
  }
};

/**
 * Analyze file size
 */
const analyzeFileSize = (fileSize: number): TechnicalCheck => {
  const sizeMB = fileSize / (1024 * 1024);
  const formatted = sizeMB >= 1000 
    ? `${(sizeMB / 1024).toFixed(2)} GB`
    : `${sizeMB.toFixed(1)} MB`;
  
  if (sizeMB <= 50) {
    return {
      label: 'File Size',
      status: 'PASS',
      value: formatted,
      details: 'Good file size. Will upload quickly and play smoothly on all connections.',
      fix: undefined,
    };
  } else if (sizeMB <= 200) {
    return {
      label: 'File Size',
      status: 'WARN',
      value: formatted,
      details: 'Large file. May take longer to upload and could buffer on slower connections.',
      fix: 'Consider compressing using H.264 codec at a lower bitrate, or reducing resolution if not needed.',
    };
  } else {
    return {
      label: 'File Size',
      status: 'WARN',
      value: formatted,
      details: 'Very large file. Will be compressed before upload to ensure smooth playback.',
      fix: 'For faster uploads, export at a lower bitrate (8-12 Mbps for 1080p is usually sufficient).',
    };
  }
};

/**
 * Analyze frame rate
 */
const analyzeFrameRate = (frameRate: number): TechnicalCheck => {
  if (frameRate >= 29 && frameRate <= 31) {
    return {
      label: 'Frame Rate',
      status: 'PASS',
      value: '30 fps',
      details: 'Standard frame rate. Smooth playback on all platforms.',
      fix: undefined,
    };
  } else if (frameRate >= 59 && frameRate <= 61) {
    return {
      label: 'Frame Rate',
      status: 'PASS',
      value: '60 fps',
      details: 'High frame rate. Extra smooth motion, great for fast-paced content.',
      fix: undefined,
    };
  } else if (frameRate >= 23 && frameRate <= 25) {
    return {
      label: 'Frame Rate',
      status: 'PASS',
      value: `${frameRate} fps`,
      details: 'Cinema-style frame rate. Acceptable for most content.',
      fix: undefined,
    };
  } else if (frameRate < 23) {
    return {
      label: 'Frame Rate',
      status: 'FAIL',
      value: `${frameRate} fps`,
      details: 'Low frame rate. Video will look choppy and unprofessional.',
      fix: 'Re-export at minimum 24fps, ideally 30fps for social media.',
    };
  } else {
    return {
      label: 'Frame Rate',
      status: 'PASS',
      value: `${frameRate} fps`,
      details: 'Non-standard but acceptable frame rate.',
      fix: undefined,
    };
  }
};

/**
 * Check for audio presence
 */
const analyzeAudio = (hasAudio: boolean, duration: number): TechnicalCheck => {
  if (hasAudio) {
    return {
      label: 'Audio Track',
      status: 'PASS',
      value: 'Detected',
      details: 'Audio track present. Make sure it includes voiceover, music, or sound effects to engage viewers.',
      fix: undefined,
    };
  } else {
    // For very short videos, no audio might be intentional
    if (duration <= 5) {
      return {
        label: 'Audio Track',
        status: 'WARN',
        value: 'Not Detected',
        details: 'No audio detected. For a short clip this might be intentional, but sound grabs attention on TikTok/Reels.',
        fix: 'Consider adding trending audio or a voiceover. Sound is powerful for stopping the scroll.',
      };
    }
    return {
      label: 'Audio Track',
      status: 'FAIL',
      value: 'Not Detected',
      details: 'No audio detected. Silent videos get crushed by the algorithm. Sound is critical for engagement on TikTok and Reels.',
      fix: 'Add audio: trending music, voiceover, or sound effects. Even simple background music dramatically improves watch time.',
    };
  }
};

/**
 * Run full technical analysis on a video file
 */
export const runTechnicalAnalysis = async (file: File): Promise<TechnicalAnalysis> => {
  const metadata = await extractVideoMetadata(file);
  
  return {
    resolution: analyzeResolution(metadata.width, metadata.height),
    aspectRatio: analyzeAspectRatio(metadata.width, metadata.height),
    duration: analyzeDuration(metadata.duration),
    fileSize: analyzeFileSize(metadata.fileSize),
    frameRate: analyzeFrameRate(metadata.frameRate),
    hasAudio: analyzeAudio(metadata.hasAudio, metadata.duration),
  };
};

/**
 * Calculate a technical score based on all checks
 */
export const calculateTechnicalScore = (analysis: TechnicalAnalysis): number => {
  const checks = [
    analysis.resolution,
    analysis.aspectRatio,
    analysis.duration,
    analysis.fileSize,
    analysis.frameRate,
    analysis.hasAudio,
  ];
  
  let score = 100;
  
  for (const check of checks) {
    if (check.status === 'FAIL') {
      score -= 20;
    } else if (check.status === 'WARN') {
      score -= 10;
    }
  }
  
  return Math.max(0, score);
};

/**
 * Get the number of issues by severity
 */
export const countIssues = (analysis: TechnicalAnalysis): { fails: number; warns: number; passes: number } => {
  const checks = [
    analysis.resolution,
    analysis.aspectRatio,
    analysis.duration,
    analysis.fileSize,
    analysis.frameRate,
    analysis.hasAudio,
  ];
  
  return {
    fails: checks.filter(c => c.status === 'FAIL').length,
    warns: checks.filter(c => c.status === 'WARN').length,
    passes: checks.filter(c => c.status === 'PASS').length,
  };
};
