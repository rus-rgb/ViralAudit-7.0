import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// ==========================================
// TYPES
// ==========================================
export interface CompressionResult {
  file: File;
  method: 'ffmpeg' | 'canvas' | 'skipped';
  originalSize: number;
  compressedSize: number;
  duration: number; // in seconds
}

// ==========================================
// FFMPEG SINGLETON
// ==========================================
let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

// ==========================================
// LOAD FFMPEG
// ==========================================
export const loadFFmpeg = async (onProgress?: (message: string) => void): Promise<FFmpeg> => {
  if (ffmpegLoaded && ffmpeg) {
    return ffmpeg;
  }

  if (ffmpegLoading) {
    // Wait for existing load to complete
    while (ffmpegLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (ffmpeg && ffmpegLoaded) return ffmpeg;
  }

  ffmpegLoading = true;
  onProgress?.('Loading FFmpeg encoder...');

  try {
    ffmpeg = new FFmpeg();

    // Log progress
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    // Load FFmpeg core from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegLoaded = true;
    onProgress?.('FFmpeg ready!');
    console.log('✅ FFmpeg.wasm loaded successfully!');
    
    return ffmpeg;
  } catch (error) {
    console.error('❌ Failed to load FFmpeg:', error);
    ffmpegLoading = false;
    throw error;
  } finally {
    ffmpegLoading = false;
  }
};

// ==========================================
// COMPRESS VIDEO WITH FFMPEG
// ==========================================
export const compressVideoFFmpeg = async (
  file: File,
  onProgress: (progress: number, message: string) => void,
  options?: {
    maxSizeMB?: number;
    maxHeight?: number;
    targetBitrate?: string;
  }
): Promise<File> => {
  const {
    maxSizeMB = 20,  // Only compress files larger than 20MB
    maxHeight = 540, // Reduced to 540p for faster processing
    targetBitrate = '1M'
  } = options || {};

  // Skip if already small enough
  if (file.size <= maxSizeMB * 1024 * 1024) {
    console.log('📦 File already optimized, skipping compression');
    onProgress(100, 'File already optimized');
    return file;
  }

  console.log(`🗜️ Compressing ${(file.size / 1024 / 1024).toFixed(1)}MB video...`);
  onProgress(0, 'Initializing encoder...');

  // Load FFmpeg
  const ffmpegInstance = await loadFFmpeg((msg) => onProgress(5, msg));
  
  onProgress(10, 'Reading video file...');

  // Write input file to FFmpeg virtual filesystem
  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output.mp4';
  
  await ffmpegInstance.writeFile(inputName, await fetchFile(file));
  
  onProgress(20, 'Analyzing video...');

  // Set up progress tracking
  let lastProgress = 20;
  ffmpegInstance.on('progress', ({ progress }) => {
    const currentProgress = 20 + Math.floor(progress * 70); // 20-90%
    if (currentProgress > lastProgress) {
      lastProgress = currentProgress;
      onProgress(currentProgress, `Compressing... ${Math.floor(progress * 100)}%`);
    }
  });

  // Run FFmpeg compression - OPTIMIZED FOR SPEED
  // -preset ultrafast: fastest encoding (larger file but much faster)
  // -crf 32: lower quality but faster (28 is default, higher = faster/smaller)
  // -tune fastdecode: optimize for fast decoding
  // -vf scale: resize to 540p for speed (still good for AI analysis)
  // -r 24: reduce framerate to 24fps
  // -an: remove audio (not needed for video analysis)
  await ffmpegInstance.exec([
    '-i', inputName,
    '-vf', `scale=-2:min(540\\,ih)`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '32',
    '-tune', 'fastdecode',
    '-r', '24',
    '-an',
    '-movflags', '+faststart',
    '-y',
    outputName
  ]);

  onProgress(90, 'Finalizing...');

  // Read compressed file
  const data = await ffmpegInstance.readFile(outputName);
  
  // Clean up
  await ffmpegInstance.deleteFile(inputName);
  await ffmpegInstance.deleteFile(outputName);

  // Create new File object
  const compressedBlob = new Blob([data], { type: 'video/mp4' });
  const compressedFile = new File(
    [compressedBlob],
    file.name.replace(/\.[^.]+$/, '_compressed.mp4'),
    { type: 'video/mp4' }
  );

  const originalMB = (file.size / 1024 / 1024).toFixed(1);
  const compressedMB = (compressedFile.size / 1024 / 1024).toFixed(1);
  const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

  console.log(`✅ Compressed: ${originalMB}MB → ${compressedMB}MB (${reduction}% reduction)`);
  onProgress(100, `Compressed to ${compressedMB}MB`);

  return compressedFile;
};

// ==========================================
// FALLBACK: Canvas-based compression
// ==========================================
export const compressVideoCanvas = async (
  file: File,
  onProgress: (progress: number, message: string) => void
): Promise<File> => {
  if (file.size <= 15 * 1024 * 1024) {
    onProgress(100, 'File already optimized');
    return file;
  }

  console.log('🎨 Using canvas fallback compression...');
  onProgress(0, 'Preparing video...');

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      const maxHeight = 720;
      const scale = video.videoHeight > maxHeight ? maxHeight / video.videoHeight : 1;
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);

      const duration = video.duration;
      const fps = 24;
      const totalFrames = Math.floor(duration * fps);

      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 1000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, '.webm'),
          { type: 'video/webm' }
        );
        onProgress(100, 'Compression complete');
        resolve(compressedFile);
      };

      mediaRecorder.onerror = () => reject(new Error('Canvas compression failed'));
      mediaRecorder.start();

      let currentFrame = 0;
      const frameInterval = 1 / fps;

      const processFrame = () => {
        video.currentTime = currentFrame * frameInterval;
      };

      video.onseeked = () => {
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        currentFrame++;
        const progress = Math.floor((currentFrame / totalFrames) * 95);
        onProgress(progress, `Processing frame ${currentFrame}/${totalFrames}`);

        if (currentFrame < totalFrames) {
          requestAnimationFrame(processFrame);
        } else {
          setTimeout(() => mediaRecorder.stop(), 100);
        }
      };

      processFrame();
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
};

// ==========================================
// SMART COMPRESS: Try FFmpeg, fallback to Canvas
// ==========================================
export const compressVideo = async (
  file: File,
  onProgress: (progress: number, message: string) => void
): Promise<CompressionResult> => {
  const startTime = Date.now();
  const originalSize = file.size;

  // Skip if small enough
  if (file.size <= 15 * 1024 * 1024) {
    onProgress(100, 'File already optimized');
    console.log('⏭️ Skipping compression - file already small enough');
    return {
      file,
      method: 'skipped',
      originalSize,
      compressedSize: file.size,
      duration: 0
    };
  }

  try {
    // Try FFmpeg first (faster, better quality)
    console.log('🚀 Attempting FFmpeg.wasm compression...');
    const compressedFile = await compressVideoFFmpeg(file, onProgress);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`✅ FFmpeg compression complete in ${duration.toFixed(1)}s`);
    return {
      file: compressedFile,
      method: 'ffmpeg',
      originalSize,
      compressedSize: compressedFile.size,
      duration
    };
  } catch (error) {
    console.warn('⚠️ FFmpeg failed, falling back to canvas:', error);
    onProgress(0, 'FFmpeg unavailable, using fallback...');
    
    // Fallback to canvas-based compression
    const compressedFile = await compressVideoCanvas(file, onProgress);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`✅ Canvas compression complete in ${duration.toFixed(1)}s`);
    return {
      file: compressedFile,
      method: 'canvas',
      originalSize,
      compressedSize: compressedFile.size,
      duration
    };
  }
};

// ==========================================
// HELPERS
// ==========================================
function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    'mp4': '.mp4',
    'mov': '.mov',
    'webm': '.webm',
    'avi': '.avi',
    'mkv': '.mkv',
    'm4v': '.m4v',
  };
  return map[ext || ''] || '.mp4';
}

// ==========================================
// CHECK FFMPEG SUPPORT
// ==========================================
export const isFFmpegSupported = (): boolean => {
  // Check for SharedArrayBuffer support (required for FFmpeg.wasm)
  try {
    const supported = typeof SharedArrayBuffer !== 'undefined';
    console.log(`🔍 SharedArrayBuffer supported: ${supported}`);
    return supported;
  } catch {
    console.log('🔍 SharedArrayBuffer: NOT supported');
    return false;
  }
};
